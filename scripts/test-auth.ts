import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createProject } from 'create-fastang';
const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), 'fastang-auth-'));
const environment = { ...process.env, AUTH_SESSION_KEY: randomBytes(32).toString('hex'), AUTH_DEMO_PASSWORD: randomBytes(24).toString('hex'), AUTH_ORIGIN: 'http://127.0.0.1' };
try {
  const app = join(temporary, 'app');
  const packed = JSON.parse((await run('npm', ['pack', '--workspace', '@fastang/core', '--pack-destination', temporary, '--json'], { maxBuffer: 4e6 })).stdout);
  const core = Array.isArray(packed) ? packed[0] : packed['@fastang/core'];
  await createProject({ directory: 'app', cwd: temporary, corePackage: join(temporary, core.filename) });
  await cp(resolve('examples/auth/src'), join(app, 'src'), { recursive: true });
  await cp(resolve('examples/auth/scripts'), join(app, 'scripts'), { recursive: true });
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  manifest.dependencies['@fastify/secure-session'] = '8.4.1';
  manifest.dependencies['@fastify/rate-limit'] = '11.2.1';
  manifest.scripts['build:vercel'] += ' && node scripts/prepare-vercel.mjs';
  await writeFile(join(app, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: app, timeout: 180_000, maxBuffer: 8e6 });
  try { await run('npm', ['run', 'build'], { cwd: app, env: environment, timeout: 180_000, maxBuffer: 8e6 }); }
  catch (error) { console.error((error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
  // Reserve a free loopback port so the configured origin is known before startup.
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = (reservation.address() as import('node:net').AddressInfo).port;
  await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const baseURL = `http://127.0.0.1:${port}`;
  Object.assign(process.env, environment, { AUTH_ORIGIN: baseURL });
  const { createProductionServer } = await import(pathToFileURL(join(app, 'dist/server/index.js')).href);
  const server = await createProductionServer();
  try {
    await server.listen({ port, host: '127.0.0.1' });
    const child = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.auth.config.ts', ...process.argv.slice(2)], {
      env: { ...process.env, FASTANG_E2E_BASE_URL: baseURL }, stdio: 'inherit',
    });
    const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    assert.equal(code, 0, 'Authentication browser tests failed');
  } finally { await server.close(); }
  try { await run('npm', ['run', 'build:vercel'], { cwd: app, env: process.env, timeout: 180_000, maxBuffer: 8e6 }); }
  catch (error) { console.error((error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
  const plan = JSON.parse(await readFile(join(app, 'dist/vercel-manifest.json'), 'utf8'));
  const api = plan.functions.find((fn: { entry: string }) => fn.entry === 'api');
  assert.ok(api);
  const directory = join(app, '.vercel/output/functions', api.name + '.func');
  const config = JSON.parse(await readFile(join(directory, '.vc-config.json'), 'utf8'));
  const { default: handler } = await import(pathToFileURL(join(directory, config.handler)).href);
  const { default: inject } = await import('light-my-request');
  const login = await inject(handler, { method: 'POST', url: '/api/auth/login', headers: { origin: baseURL }, payload: { password: environment.AUTH_DEMO_PASSWORD } });
  assert.equal(login.statusCode, 200);
  const cookie = String(login.headers['set-cookie']).split(';')[0];
  const session = await inject(handler, { method: 'GET', url: '/api/auth/session', headers: { cookie } });
  assert.equal(session.statusCode, 200);
  assert.deepEqual(session.json(), { user: { name: 'Demo user' } });
  const page = plan.functions.find((fn: { paths: string[] }) => fn.paths.includes('/account'));
  assert.ok(page);
  const pageDirectory = join(app, '.vercel/output/functions', page.name + '.func');
  const pageConfig = JSON.parse(await readFile(join(pageDirectory, '.vc-config.json'), 'utf8'));
  const { default: pageHandler } = await import(pathToFileURL(join(pageDirectory, pageConfig.handler)).href);
  const account = await inject(pageHandler, { url: '/account', headers: { cookie } });
  assert.equal(account.statusCode, 200);
  assert.match(account.body, /Welcome, Demo user/);
  const anonymous = await inject(pageHandler, '/account');
  assert.equal(anonymous.statusCode, 302);
  assert.equal(anonymous.headers.location, '/login');
  console.log('Packaged Vercel API and protected SSR passed, including native session dependency.');

} finally { await rm(temporary, { recursive: true, force: true }); }
