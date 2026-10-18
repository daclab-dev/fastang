import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const cli = resolve('packages/cli/bin/fastang.mjs');
test('standalone CLI works outside an app and forwards commands to the local core', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fastang-standalone-'));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: 'utf8' });
  try {
    assert.equal(run('--help').status, 0);
    const manifest = JSON.parse(await readFile(resolve('packages/cli/package.json'), 'utf8'));
    assert.equal(run('--version').stdout.trim(), manifest.version);
    const missing = run('dev');
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /No local @fastang\/core/);
    assert.notEqual(run('unknown').status, 0);
    const core = join(directory, 'node_modules/@fastang/core');
    await mkdir(core, { recursive: true });
    await writeFile(join(core, 'package.json'), JSON.stringify({ name: '@fastang/core', type: 'module', exports: './index.js', bin: { fastang: './legacy.mjs' } }));
    await writeFile(join(core, 'index.js'), 'throw new Error("must not evaluate core exports");');
    await writeFile(join(core, 'legacy.mjs'), 'console.log(JSON.stringify(process.argv.slice(2))); process.exitCode = 7;');
    const result = run('build', '--vercel', 'argument with spaces');
    assert.equal(result.status, 7);
    assert.deepEqual(JSON.parse(result.stdout), ['build', '--vercel', 'argument with spaces']);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('standalone CLI forwards termination to its running local server', { skip: process.platform === 'win32', timeout: 10000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fastang-cli-signal-'));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const core = join(directory, 'node_modules/@fastang/core');
    await mkdir(core, { recursive: true });
    await writeFile(join(core, 'package.json'), JSON.stringify({ name: '@fastang/core', bin: { fastang: './server.mjs' } }));
    await writeFile(join(core, 'server.mjs'), "process.on('SIGTERM', () => { console.log('stopped'); process.exit(0); }); console.log('ready'); setInterval(() => {}, 1000);");
    child = spawn(process.execPath, [cli, 'dev'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    const running = child;
    let output = '';
    const finished = new Promise<number | null>((resolveRun, reject) => {
      running.on('error', reject);
      running.on('close', resolveRun);
    });
    await new Promise<void>((ready, reject) => {
      running.on('error', reject);
      running.stdout!.on('data', data => { output += String(data); if (output.includes('ready')) ready(); });
      running.on('exit', () => { if (!output.includes('ready')) reject(new Error('Server exited before startup')); });
    });
    running.kill('SIGTERM');
    assert.equal(await finished, 0);
    assert.match(output, /stopped/);
  } finally { child?.kill('SIGTERM'); await rm(directory, { recursive: true, force: true }); }
});
