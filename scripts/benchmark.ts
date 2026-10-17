import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile, fork, type ChildProcess } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const run = promisify(execFile);
const repository = process.cwd();
const arguments_ = process.argv.slice(2);
const smoke = arguments_.includes('--smoke');
assert.ok(arguments_.every(argument => argument === '--smoke'), 'Usage: npm run benchmark [-- --smoke]');
const settings = { startupSamples: smoke ? 1 : 5, warmup: smoke ? 2 : 20, samples: smoke ? 5 : 200, concurrency: 1 };
const temporary = await mkdtemp(join(tmpdir(), 'fastang-benchmark-'));
const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1];
  return { count: values.length, min: sorted[0], median: percentile(0.5), p95: percentile(0.95), max: sorted.at(-1), mean: values.reduce((a, b) => a + b, 0) / values.length };
};
async function size(directory: string, compress: boolean): Promise<{ files: number; bytes: number; gzipBytes: number; brotliBytes: number }> {
  const result = { files: 0, bytes: 0, gzipBytes: 0, brotliBytes: 0 };
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await size(file, compress);
      for (const key of ['files', 'bytes', 'gzipBytes', 'brotliBytes'] as const) result[key] += nested[key];
    } else {
      assert.ok(entry.isFile(), `Unexpected non-file in build output: ${file}`);
      const data = await readFile(file);
      result.files++;
      result.bytes += data.length;
      if (compress) {
        result.gzipBytes += gzipSync(data, { level: 9 }).length;
        result.brotliBytes += brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
      }
    }
  }
  return result;
}
async function start(entry: string): Promise<{ child: ChildProcess; address: string; readyMs: number }> {
  const started = performance.now();
  const child = fork(resolve('scripts/benchmark-server.mjs'), [entry], { cwd: dirname(entry), execArgv: [], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let logs = '';
  child.stdout!.on('data', chunk => { logs = (logs + chunk).slice(-8000); });
  child.stderr!.on('data', chunk => { logs = (logs + chunk).slice(-8000); });
  try {
    const address = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('Startup timed out: ' + logs)); }, 30_000);
      const cleanup = () => { clearTimeout(timer); child.off('exit', failed); child.off('error', error); child.off('message', message); };
      const failed = () => { cleanup(); reject(new Error('Server exited before listening: ' + logs)); };
      const error = (error: Error) => { cleanup(); reject(error); };
      const message = (value: unknown) => {
        if (typeof value === 'object' && value !== null && 'address' in value && typeof value.address === 'string') { cleanup(); resolve(value.address); }
      };
      child.once('exit', failed); child.once('error', error); child.on('message', message);
    });
    return { child, address, readyMs: performance.now() - started };
  } catch (error) { await stop(child); throw error; }
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>(resolve => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    if (child.connected) child.send('close', error => { if (error) child.kill('SIGTERM'); });
    else child.kill('SIGTERM');
  });
}
const workloads = [
  { path: '/', render: 'ssr', text: 'Your next idea starts here' },
  { path: '/greet/Ada', render: 'ssr', text: 'Hello, Ada!' },
  { path: '/about', render: 'prerender', text: 'Built ahead of time.' },
  { path: '/api/health', render: undefined, text: '"ok":true' },
];
async function request(address: string, workload: typeof workloads[number]) {
  const started = performance.now();
  const response = await fetch(address + workload.path, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
  const body = await response.text();
  const duration = performance.now() - started;
  assert.equal(response.status, 200, workload.path);
  assert.ok(body.includes(workload.text), `Unexpected response from ${workload.path}`);
  if (workload.render) assert.equal(response.headers.get('x-fastang-render'), workload.render);
  return duration;
}
try {
  const app = join(temporary, 'app');
  await cp(resolve('examples/starter'), app, { recursive: true, filter: file => !/(?:^|\/)(node_modules|dist|\.fastang|\.angular|\.vercel)(?:\/|$)/.test(file) });
  await symlink(resolve('node_modules'), join(app, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  console.log('benchmark: building an isolated production starter');
  const started = performance.now();
  try { await run('npm', ['run', 'build'], { cwd: app, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 }); }
  catch (error) { console.error((error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
  const buildMs = performance.now() - started;
  const client = await size(join(app, 'dist/client'), true);
  const { files, bytes } = await size(join(app, 'dist/server'), false);
  const startup: { listenMs: number; firstSsrMs: number; spawnThroughFirstSsrMs: number }[] = [];
  const entry = join(app, 'dist/server/index.js');
  for (let index = 0; index < settings.startupSamples; index++) {
    const started = performance.now();
    const server = await start(entry);
    try {
      const firstSsrMs = await request(server.address, workloads[0]);
      startup.push({ listenMs: server.readyMs, firstSsrMs, spawnThroughFirstSsrMs: performance.now() - started });
    } finally { await stop(server.child); }
  }
  const server = await start(entry);
  const requests = [];
  try {
    for (const workload of workloads) {
      for (let index = 0; index < settings.warmup; index++) await request(server.address, workload);
      const milliseconds = [];
      for (let index = 0; index < settings.samples; index++) milliseconds.push(await request(server.address, workload));
      requests.push({ path: workload.path, rendering: workload.render ?? 'api', milliseconds: summary(milliseconds), samplesMs: milliseconds });
    }
  } finally { await stop(server.child); }
  const commit = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const dirty = Boolean((await run('git', ['status', '--porcelain'])).stdout.trim());
  const report = {
    schemaVersion: 1, lockfileSha256: createHash('sha256').update(await readFile(resolve('package-lock.json'))).digest('hex'), createdAt: new Date().toISOString(), smoke, commit, dirty,
    environment: { node: process.version, platform: platform(), release: release(), arch: process.arch, cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
    settings, build: { milliseconds: buildMs, client, server: { files, bytes } },
    startup: { listenMs: summary(startup.map(sample => sample.listenMs)), firstSsrMs: summary(startup.map(sample => sample.firstSsrMs)), spawnThroughFirstSsrMs: summary(startup.map(sample => sample.spawnThroughFirstSsrMs)), samples: startup }, requests,
    versions: { application: JSON.parse(await readFile(join(app, 'package.json'), 'utf8')), core: JSON.parse(await readFile(resolve('packages/core/package.json'), 'utf8')).version },
  };
  const output = resolve('.fastang/benchmarks', new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.table(requests.map(result => ({ path: result.path, mode: result.rendering, 'median ms': result.milliseconds.median.toFixed(2), 'p95 ms': result.milliseconds.p95.toFixed(2) })));
  console.log(`benchmark: client ${client.bytes} bytes, server ${bytes} bytes; startup median ${report.startup.listenMs.median.toFixed(2)} ms`);
  console.log(`benchmark: report ${output}`);
} finally { await rm(temporary, { recursive: true, force: true }); }
