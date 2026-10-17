import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), 'fastang-starter-'));
try {
  const { stdout } = await run('npm', ['pack', '--workspace', '@fastang/core', '--pack-destination', temporary, '--json'], { maxBuffer: 4 * 1024 * 1024 });
  const packed = JSON.parse(stdout);
  const { filename, files } = Array.isArray(packed) ? packed[0] : packed['@fastang/core'];
  assert.ok(files.some((file: { path: string }) => file.path === 'dist/index.d.ts'));
  assert.ok(!files.some((file: { path: string }) => file.path.startsWith('src/') || file.path.includes('assets/')));
  const generatorPack = await run('npm', ['pack', '--workspace', 'create-fastang', '--pack-destination', temporary, '--json'], { maxBuffer: 4 * 1024 * 1024 });
  const generatorPacked = JSON.parse(generatorPack.stdout);
  const generator = Array.isArray(generatorPacked) ? generatorPacked[0] : generatorPacked['create-fastang'];
  assert.ok(generator.files.some((file: { path: string }) => file.path === 'template/_gitignore'));
  assert.ok(!generator.files.some((file: { path: string }) => /node_modules|fastang.routes.ts|package-lock.json/.test(file.path)));
  const tool = join(temporary, 'generator');
  await run('npm', ['install', '--prefix', tool, join(temporary, generator.filename), '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: temporary, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 });
  const app = join(temporary, 'app');
  await run(process.execPath, [join(tool, 'node_modules/create-fastang/bin/create-fastang.mjs'), 'app', '--name', 'generated-fastang-app', '--core-package', join(temporary, filename), '--install'], { cwd: temporary, maxBuffer: 4 * 1024 * 1024, timeout: 180_000 });
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'generated-fastang-app');
  assert.equal(manifest.dependencies['@fastang/core'], `file:${join(temporary, filename)}`);
  assert.match(await readFile(join(app, '.gitignore'), 'utf8'), /node_modules/);
  assert.doesNotMatch(await readFile(join(app, 'README.md'), 'utf8'), /workspace|examples\/starter|file:\.\./);
  const command = async (args: string[]) => {
    console.log(`starter: npm ${args.join(' ')}`);
    try { await run('npm', args, { cwd: app, maxBuffer: 8 * 1024 * 1024, timeout: 180_000 }); }
    catch (error) { console.error((error as { stdout?: string; stderr?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
  };
  await command(['run', 'build']);
  const { createProductionServer } = await import(pathToFileURL(join(app, 'dist/server/index.js')).href);
  const server = await createProductionServer();
  try {
    const home = await server.inject('/');
    assert.equal(home.statusCode, 200);
    assert.match(home.body, /Your next idea starts here/);
    assert.match(home.body, /ngh=/);
    const greeting = await server.inject('/greet/Ada');
    assert.equal(greeting.statusCode, 200);
    assert.match(greeting.body, /Hello, Ada!/);
    assert.equal((await server.inject('/api/health')).json().ok, true);
    assert.equal((await server.inject('/about')).headers['x-fastang-render'], 'prerender');
    assert.equal((await server.inject('/missing')).statusCode, 404);
  } finally { await server.close(); }

  // Exercise the packaged development CLI, including its backend restart path.
  const dev = spawn(process.execPath, ['node_modules/@fastang/core/bin/fastang.mjs', 'dev'], { cwd: app, env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  dev.stdout.on('data', chunk => { logs += chunk; });
  dev.stderr.on('data', chunk => { logs += chunk; });
  async function address(after = 0) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const match = logs.slice(after).match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) return match[1];
      if (dev.exitCode !== null) throw new Error(logs);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Development startup timed out: ' + logs);
  }
  try {
    const base = await address();
    assert.match(await (await fetch(base + '/greet/Grace')).text(), /Hello, Grace!/);
    const offset = logs.length;
    const endpoint = join(app, 'src/server/api/greet/[name].get.ts');
    await writeFile(endpoint, (await readFile(endpoint, 'utf8')).replace('Hello,', 'Welcome,'));
    const restarted = await address(offset);
    assert.deepEqual(await (await fetch(restarted + '/api/greet/Grace')).json(), { message: 'Welcome, Grace!' });
  } finally {
    if (dev.exitCode === null && dev.signalCode === null) {
      const exited = new Promise(resolve => dev.once('exit', resolve));
      dev.kill('SIGTERM');
      await exited;
    }
  }
  await command(['run', 'build:vercel']);
  const plan = JSON.parse(await readFile(join(app, 'dist/vercel-manifest.json'), 'utf8'));
  const greetingFunction = plan.functions.find((fn: { paths: string[] }) => fn.paths.includes('/greet/:name'));
  assert.ok(greetingFunction);
  const directory = join(app, '.vercel/output/functions', greetingFunction.name + '.func');
  const config = JSON.parse(await readFile(join(directory, '.vc-config.json'), 'utf8'));
  const { default: handler } = await import(pathToFileURL(join(directory, config.handler)).href);
  const { default: inject } = await import('light-my-request');
  const response = await inject(handler, '/greet/Linus');
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /Welcome, Linus!/);
  console.log('Generator and independent starter passed: tarball installation, types, SSR, API, prerender, 404, dev restart and Vercel function.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
