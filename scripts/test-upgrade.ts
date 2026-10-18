import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), 'fastang-upgrade-'));
const app = join(temporary, 'app');
const repository = process.cwd();
const command = async (args: string[], cwd = app) => {
  console.log('upgrade: npm ' + args.join(' '));
  try { await run('npm', args, { cwd, timeout: 240_000, maxBuffer: 8 * 1024 * 1024 }); }
  catch (error) { console.error((error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
};
async function sources(directory: string, relative = ''): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const entry of await readdir(join(directory, relative), { withFileTypes: true })) {
    const file = join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(hashes, await sources(directory, file));
    else if (file.replaceAll('\\', '/') !== 'app/fastang.routes.ts') hashes[file] = createHash('sha256').update(await readFile(join(directory, file))).digest('hex');
  }
  return hashes;
}
try {
  await command(['exec', '--yes', '--package=create-fastang@0.1.0-alpha.1', '--', 'create-fastang', 'app', '--install'], temporary);
  const page = join(app, 'src/app/pages/index.page.ts');
  await writeFile(page, (await readFile(page, 'utf8')).replace('Your next idea starts here', 'Customer application'));
  const before = await sources(join(app, 'src'));
  await command(['run', 'build']);
  await command(['run', 'cli:build'], repository);
  const { stdout: packedOutput } = await run('npm', ['pack', '--workspace', '@fastang/cli', '--ignore-scripts', '--pack-destination', temporary, '--json'], { cwd: repository });
  const packedResponse = JSON.parse(packedOutput);
  const packed = Array.isArray(packedResponse) ? packedResponse[0] : packedResponse['@fastang/cli'];
  const installation = join(temporary, 'cli');
  await command(['install', '--prefix', installation, join(temporary, packed.filename), '--no-audit', '--no-fund'], temporary);
  const cli = resolve(installation, 'node_modules/@fastang/cli/bin/fastang.mjs');
  const cliRun = async (args: string[]) => {
    const result = await run(process.execPath, [cli, ...args], { cwd: app, timeout: 240_000, maxBuffer: 8 * 1024 * 1024 });
    console.log(result.stdout);
    return result;
  };
  const manifestBefore = await readFile(join(app, 'package.json'), 'utf8');
  const lockBefore = await readFile(join(app, 'package-lock.json'), 'utf8');
  // Controlled incompatible release metadata: npm is real, only the registry is local.
  const registry = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ name: '@fastang/core', 'dist-tags': { latest: '0.1.0-alpha.2' }, versions: {
      '0.1.0-alpha.2': { name: '@fastang/core', version: '0.1.0-alpha.2', peerDependencies: { typescript: '>=99.0.0' } },
    } }));
  });
  await new Promise<void>(resolveRun => registry.listen(0, '127.0.0.1', resolveRun));
  try {
    const address = registry.address();
    assert.ok(address && typeof address !== 'string');
    await assert.rejects(run(process.execPath, [cli, 'update', '--to', 'latest', '--yes'], {
      cwd: app, timeout: 30_000, env: { ...process.env, npm_config_registry: `http://127.0.0.1:${address.port}` },
    }), /typescript must satisfy >=99.0.0/);
    assert.equal(await readFile(join(app, 'package-lock.json'), 'utf8'), lockBefore);
    assert.deepEqual(await sources(join(app, 'src')), before);
    console.log('Controlled incompatible release blocked before installation; lockfile and sources preserved.');
  } finally { await new Promise<void>((resolveRun, reject) => registry.close(error => error ? reject(error) : resolveRun())); }
  await cliRun(['update', '--to', '0.1.0-alpha.2', '--dry-run']);
  assert.equal(await readFile(join(app, 'package.json'), 'utf8'), manifestBefore);
  assert.equal(await readFile(join(app, 'package-lock.json'), 'utf8'), lockBefore);
  await cliRun(['update', '--to', '0.1.0-alpha.2', '--yes']);
  assert.match((await cliRun(['update', '--to', '0.1.0-alpha.2', '--yes'])).stdout, /Already installed/);
  await assert.rejects(cliRun(['update', '--to', '0.1.0-alpha.1', '--yes']), /Downgrade blocked/);
  assert.deepEqual(await sources(join(app, 'src')), before, 'Installing the core must preserve application sources');
  await command(['run', 'build']);
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies['@fastang/core'], '0.1.0-alpha.2');
  assert.equal(JSON.parse(await readFile(join(app, 'node_modules/@fastang/core/package.json'), 'utf8')).version, '0.1.0-alpha.2');
  const smoke = `import assert from 'node:assert/strict';
import { createServer } from 'node:http'; const { createProductionServer } = await import('./dist/server/index.js'); const server = await createProductionServer(); try { const page = await server.inject('/'); assert.equal(page.statusCode,200); assert.match(page.body,/Customer application/); assert.equal((await server.inject('/api/health')).json().ok,true); assert.match((await server.inject('/greet/Ada')).body,/Hello, Ada!/); } finally { await server.close(); }`;
  await run(process.execPath, ['--input-type=module', '-e', smoke], { cwd: app, timeout: 30_000 });
  await command(['run', 'build:vercel']);
  assert.deepEqual(await sources(join(app, 'src')), before, 'Builds must preserve custom application sources');
  console.log('Registry upgrade alpha.1 → alpha.2 passed: custom sources preserved, production SSR/API and Vercel build verified.');
} finally { await rm(temporary, { recursive: true, force: true }); }
