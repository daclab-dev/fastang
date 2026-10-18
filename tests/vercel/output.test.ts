import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import inject from 'light-my-request';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const output = resolve('.vercel/output');
test('SSR API calls work when the runtime disables require(ESM)', async () => {
  const handler = pathToFileURL(join(output, 'functions/__fastang/ssr.func/dist/server/vercel.js')).href;
  // Vercel's launcher can disable require(ESM), even on Node versions that support it.
  const script = `
    import assert from 'node:assert/strict';
    import { createServer } from 'node:http';
    const { default: handler } = await import(${JSON.stringify(handler)});
    const server = createServer(handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      for (const prefix of ['', '/en']) {
        const product = await fetch(base + prefix + '/products/starter');
        assert.equal(product.status, 200);
        assert.match(await product.text(), /FastAng Starter/);
        const request = await fetch(base + prefix + '/request', {
          headers: { 'x-request-label': 'vercel_runtime_regression' },
        });
        assert.equal(request.status, 200);
        assert.match(await request.text(), /vercel_runtime_regression/);
      }
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  `;
  await promisify(execFile)(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', script], { timeout: 30_000 });
});

test('Vercel output keeps the SSR template private and routes public HTML to CDN', async () => {
  const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'));
  assert.equal(config.version, 3);
  assert.ok(config.routes.find((route: any) => route.dest === '/__fastang/api'));
  assert.equal(config.routes.at(-1).dest, '/__fastang/ssr');
  const staticFiles = await readdir(join(output, 'static'));
  assert.ok(!staticFiles.includes('index.html'), 'The root template must never bypass SSR');
  for (const path of ['/about', '/en/about']) {
    const route = config.routes.find((route: any) => route.src && new RegExp(route.src).test(path) && route.dest?.endsWith('/index.html'));
    assert.ok(route);
    assert.deepEqual(route.methods, ['GET', 'HEAD']);
    assert.match(await readFile(join(output, 'static', route.dest), 'utf8'), /ngh=/);
  }
});

test('packaged functions run outside the project with only their traced dependencies', async () => {
  const isolated = await mkdtemp(join(tmpdir(), 'fastang-vercel-'));
  try {
    for (const kind of ['api', 'ssr']) {
      const name = '__fastang/' + kind;
      const target = join(isolated, `${name}.func`);
      await cp(join(output, `functions/${name}.func`), target, { recursive: true });
      const config = JSON.parse(await readFile(join(target, '.vc-config.json'), 'utf8'));
      assert.equal(config.runtime, 'nodejs24.x');
      assert.equal(config.shouldAddHelpers, false);
      const { default: handler } = await import(pathToFileURL(join(target, config.handler)).href);
      if (kind === 'api') {
        assert.equal((await inject(handler, '/api/health')).statusCode, 200);
        assert.equal((await inject(handler, '/api/products/INVALID!')).statusCode, 400);
        assert.equal((await inject(handler, '/api/not-found')).statusCode, 404);
        assert.equal((await inject(handler, { method: 'HEAD', url: '/api/health' })).body, '');
        const files = await readdir(join(target, 'dist/server'));
        assert.ok(!files.some((file) => file.startsWith('i18n-')), 'API function does not include the Angular renderer');
      } else {
        const archive = await inject(handler, '/en/docs/v/0-1-0-alpha-1/api');
        assert.equal(archive.statusCode, 404);
        assert.doesNotMatch(archive.body, /Native route options/);
        assert.equal((await inject(handler, '/en/docs/v/unknown/api')).statusCode, 404);
        const home = await inject(handler, '/en');
        assert.equal(home.statusCode, 200);
        assert.match(home.body, /A solid frontend/);
        assert.match(home.headers['cache-control']!, /private, no-store/);
        const blocked = await inject(handler, '/en/products/starter?preview=blocked&ref=launch');
        assert.equal(blocked.statusCode, 302);
        assert.equal(blocked.headers.location, '/en/catalog-access?ref=launch');
        assert.equal(blocked.body, '');
        assert.equal((await inject(handler, '/en/products/missing')).statusCode, 404);
        const responses = await Promise.all(['Ada', 'Grace'].map((label) => inject(handler, {
          url: '/en/request', headers: { 'x-request-label': `isolated_${label}` },
        })));
        assert.match(responses[0].body, /isolated_Ada/);
        assert.doesNotMatch(responses[0].body, /isolated_Grace/);
        assert.match(responses[1].body, /isolated_Grace/);
        assert.doesNotMatch(responses[1].body, /isolated_Ada/);
      }
    }
  } finally { await rm(isolated, { recursive: true, force: true }); }
});

test('route functions dispatch specific URLs, group languages and isolate API registrations', async () => {
  const manifest = JSON.parse(await readFile('dist/vercel-manifest.json', 'utf8'));
  assert.equal(manifest.mode, 'routes');
  assert.ok(manifest.functions.length <= 12, 'The documentation site must stay within its current Vercel deployment budget');
  assert.equal(manifest.functions.length, 12);
  const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'));
  const destination = (url: string) => config.routes.find((route: any) => route.src && route.dest && new RegExp(route.src).test(url))?.dest;
  const home = manifest.functions.find((fn: any) => fn.paths.includes('/'));
  const product = manifest.functions.find((fn: any) => fn.paths.includes('/products/:id'));
  assert.equal(destination('/'), '/' + home.name);
  assert.equal(destination('/en'), '/' + home.name);
  assert.equal(destination('/en/products/starter'), '/' + product.name);
  assert.equal(destination('/missing'), '/__fastang/ssr');
  assert.equal(destination('/api/unknown'), '/__fastang/api');
  assert.equal(destination('/en/about'), '/en/about/index.html');
  assert.equal(destination('/en/docs/getting-started'), '/en/docs/getting-started/index.html');
  assert.notEqual(destination('/en/docs/v/0-1-0-alpha-1/api'), '/en/docs/v/0-1-0-alpha-1/api/index.html');
  assert.equal(destination('/en/docs/v/unknown/api'), '/__fastang/ssr');
  const isolated = await mkdtemp(join(tmpdir(), 'fastang-route-functions-'));
  try {
    for (const fn of manifest.functions.filter((fn: any) => fn.paths.length)) {
      const target = join(isolated, fn.name + '.func');
      await cp(join(output, 'functions', fn.name + '.func'), target, { recursive: true });
      const settings = JSON.parse(await readFile(join(target, '.vc-config.json'), 'utf8'));
      const { default: handler } = await import(pathToFileURL(join(target, settings.handler)).href);
      if (fn.kind === 'api') {
        const url = fn.paths[0].replace(':id', 'starter');
        assert.equal(destination(url), '/' + fn.name);
        const response = await inject(handler, url);
        assert.equal(response.statusCode, 200, url);
        const other = url === '/api/health' ? '/api/products/starter' : '/api/health';
        assert.equal((await inject(handler, other)).statusCode, 404, 'Other filesystem endpoints are not registered in this function');
        if (url.startsWith('/api/products')) {
          assert.equal((await inject(handler, '/api/products/INVALID!')).statusCode, 400);
          assert.equal((await inject(handler, '/api/products/missing')).statusCode, 404);
        }
      } else {
        const url = fn.paths.find((path: string) => path.startsWith('/en'))!.replace(':id', 'starter').replace(':slug', 'getting-started').replace(':version', '0-1-0-alpha-3');
        const response = await inject(handler, url);
        assert.equal(response.statusCode, 200, url);
        assert.match(response.body, /<html lang="en"/);
        assert.match(response.body, /ngh=/);
        assert.match(response.headers['cache-control']!, /private, no-store/);
        if (fn.sources[0].file === 'index.page.ts') {
          assert.equal((await inject(handler, '/en/brand')).statusCode, 404, 'An omitted component must not become an empty HTTP 200');
        }
        if (url.includes('/docs/') && !fn.sources[0].file.endsWith('index.page.ts')) {
          assert.match(response.body, /Get started with FastAng/);
          assert.equal((await inject(handler, '/en/docs/unknown')).statusCode, 404);
        }
        if (url.includes('/products/')) {
          assert.match(response.body, /FastAng Starter/);
          assert.match(response.body, /data-testid="catalog-layout"/);
          assert.match(response.body, /data-testid="detail-layout"/);
          assert.equal((await inject(handler, '/en/products/missing')).statusCode, 404);
          const blocked = await inject(handler, url + '?preview=blocked');
          assert.equal(blocked.statusCode, 302);
          assert.equal(blocked.headers.location, '/en/catalog-access');
        }
      }
    }
  } finally { await rm(isolated, { recursive: true, force: true }); }
});

test('SSR bundles omit unrelated components and report their measured size', async () => {
  const manifest = JSON.parse(await readFile('dist/vercel-manifest.json', 'utf8'));
  const report = JSON.parse(await readFile('dist/vercel-bundle-report.json', 'utf8'));
  const fallback = report.functions.find((fn: any) => fn.name === '__fastang/ssr');
  const home = manifest.functions.find((fn: any) => fn.paths.includes('/'));
  const author = manifest.functions.find((fn: any) => fn.paths.includes('/author'));
  for (const fn of [home, author]) {
    const directory = join(output, 'functions', fn.name + '.func', 'dist/pages', fn.name.split('/').at(-1), 'server');
    const files = await readdir(directory);
    assert.ok(!files.some((file) => file.startsWith('brand.page-')));
    assert.ok(!files.some((file) => file.startsWith('_id_.page-')));
    assert.ok(!files.some((file) => file.startsWith('layout-')));
    assert.ok(!files.some((file) => file.startsWith(fn === home ? 'author.page-' : 'index.page-')));
    assert.ok(files.some((file) => file.startsWith(fn === home ? 'index.page-' : 'author.page-')));
    const measured = report.functions.find((item: any) => item.name === fn.name);
    assert.ok(measured.pageJavaScriptBytes < fallback.pageJavaScriptBytes);
    assert.ok(measured.serverJavaScriptBytes < fallback.serverJavaScriptBytes);
    assert.ok(measured.tracedBytes > measured.serverJavaScriptBytes, 'Dependencies are counted separately from emitted server code');
  }
});
