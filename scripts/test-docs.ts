import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseMarkdown } from '../src/app/docs/markdown';
import { guideNavigation } from '../src/app/docs/navigation';

const run = promisify(execFile);
const repository = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'fastang-doc-examples-'));
try {
  const selected = process.argv.slice(2);
  const guides = guideNavigation.filter(guide => !selected.length || selected.includes(guide.slug));
  assert.ok(guides.length, 'Choose at least one existing guide');
  for (const guide of guides) {
    const parsed = parseMarkdown(await readFile(`docs/guide/en/${guide.slug}.md`, 'utf8'));
    const app = join(temporary, guide.slug);
    await cp(resolve('examples/starter'), app, { recursive: true, filter: file => !/(?:^|\/)(node_modules|dist|\.fastang|\.angular|\.vercel)(?:\/|$)/.test(file) });
    await symlink(resolve('node_modules'), join(app, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    for (const block of parsed.blocks) {
      if (block.kind !== 'code' || !block.file) continue;
      assert.ok(/^(src\/(app|server|shared)\/[a-zA-Z0-9_./[\]-]+\.ts|fastang\.config\.ts)$/.test(block.file) && !block.file.split('/').includes('..'));
      const file = join(app, block.file);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, block.text + '\n');
    }
    console.log(`docs: building ${guide.slug} in a fresh starter`);
    try { await run('npm', ['run', 'build'], { cwd: app, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }); }
    catch (error) { console.error((error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr); throw error; }
    const { createProductionServer } = await import(pathToFileURL(join(app, 'dist/server/index.js')).href);
    const server = await createProductionServer();
    try {
      assert.equal((await server.inject('/')).statusCode, 200);
      const greeting = await server.inject('/greet/world');
      assert.equal(greeting.statusCode, 200);
      assert.match(greeting.body, /Hello, world!/);
      assert.equal((await server.inject('/missing')).statusCode, 404);
      if (guide.slug === 'routing') assert.match(greeting.body, /aria-label="Greetings"/);
      if (guide.slug === 'api') {
        const limited = await server.inject({ method: 'POST', url: '/api/limited', payload: { text: ' Hi ' } });
        assert.equal(limited.statusCode, 200);
        assert.deepEqual(limited.json(), { message: 'Hi' });
        assert.equal(limited.headers['x-route-example'], 'limited');
        assert.equal((await server.inject({ method: 'POST', url: '/api/limited', payload: { text: 'x'.repeat(100) } })).statusCode, 413);

        const created = await server.inject({ method: 'POST', url: '/api/messages', payload: { text: 'Hello' } });
        assert.equal(created.statusCode, 201);
        assert.deepEqual(created.json(), { message: 'Hello' });
        for (const payload of [{}, { text: '' }, { text: 'a'.repeat(121) }]) assert.equal((await server.inject({ method: 'POST', url: '/api/messages', payload })).statusCode, 400);
      }
      if (guide.slug === 'rendering') {
        assert.equal(greeting.headers['x-fastang-render'], 'prerender');
        assert.equal((await server.inject('/greet/Ada')).headers['x-fastang-render'], 'ssr');
      }
      if (guide.slug === 'errors') {
        const redirect = await server.inject('/greet/Ada?preview=blocked');
        assert.equal(redirect.statusCode, 302); assert.equal(redirect.headers.location, '/about'); assert.equal(redirect.body, '');
        const failure = await server.inject('/greet/' + 'a'.repeat(81));
        assert.equal(failure.statusCode, 502); assert.match(failure.body, /Greeting unavailable/);
      }
      if (guide.slug === 'configuration') assert.equal((await server.inject('/api/health')).headers['x-app-name'], 'my-fastang-app');
    } finally { await server.close(); }
    assert.equal(process.cwd(), repository);
  }
  console.log('Documentation examples passed: selected guides compile and run in the starter.');
} finally { await rm(temporary, { recursive: true, force: true }); }
