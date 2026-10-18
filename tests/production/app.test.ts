import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';

const { createProductionServer } = await import(pathToFileURL(resolve('dist/server/index.js')).href);

test('build reale: SSR, dati API, stato hydration e codici HTTP', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const home = await app.inject('/');
    assert.equal(home.statusCode, 200);
    assert.match(home.body, /Un frontend solido/);
    assert.match(home.body, /ngh=/);
    assert.match(home.body, /<script[^>]*type="application\/json"/);
    assert.equal(home.headers['x-fastang-render'], 'ssr');
    const product = await app.inject('/products/starter');
    assert.equal(product.statusCode, 200);
    assert.match(product.body, /FastAng Starter/);
    assert.match(product.body, /__nghData__/);
    const state = JSON.parse(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/.exec(product.body)![1]);
    assert.ok(Object.values(state).some((entry: any) => entry?.b?.name === 'FastAng Starter'), 'La transfer cache contiene il prodotto');
    const nextProduct = await app.inject('/products/workshop');
    const nextState = JSON.parse(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/.exec(nextProduct.body)![1]);
    assert.ok(Object.values(nextState).some((entry: any) => entry?.b?.name === 'Fullstack Workshop'), 'Anche la richiesta successiva serializza la cache');
    assert.equal((await app.inject('/products/missing')).statusCode, 404);
    assert.equal((await app.inject('/this-does-not-exist')).statusCode, 404);
    const staticPage = await app.inject('/about?utm_source=test');
    assert.equal(staticPage.statusCode, 200);
    assert.equal(staticPage.headers['x-fastang-render'], 'prerender');
    assert.equal(staticPage.body, await readFile('dist/client/about/index.html', 'utf8'));
    const asset = /src="(\/assets\/[^"]+\.js)"/.exec(home.body)?.[1];
    assert.ok(asset);
    const js = await app.inject(asset);
    assert.equal(js.statusCode, 200);
    assert.match(js.headers['cache-control']!, /immutable/);
    assert.equal((await app.inject('/api/unknown')).statusCode, 404);
    assert.equal((await app.inject({ method: 'HEAD', url: '/' })).body, '');
  } finally { await app.close(); }
});

test('SSR Angular concorrente trasferisce solo il dato della propria richiesta', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const labels = ['request_Ada_123', 'request_Grace_456', 'request_Alan_789', '</script><script>alert(1)</script>'];
    const responses = await Promise.all(labels.map((label) => app.inject({ url: '/request', headers: { 'x-request-label': label } })));
    responses.forEach((response, index) => {
      assert.equal(response.statusCode, 200);
      const escaped = labels[index].replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      assert.ok(response.body.includes(escaped));
      assert.ok(!response.body.includes('<script>alert(1)</script>'));
      for (const other of labels.filter((_, i) => i !== index && !labels[i].startsWith('<'))) assert.ok(!response.body.includes(other));
    });
  } finally { await app.close(); }
});

test('layout annidati, resolver e titoli sono renderizzati; i provider sono isolati per SSR', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const paths = ['/products/starter', '/products/workshop', '/products/starter'];
    for (const path of paths) {
      const response = await app.inject(path);
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /data-testid="catalog-layout"/);
      assert.match(response.body, /data-testid="detail-layout"/);
      assert.match(response.body, /Risoluzioni in questo layout: 1/);
      assert.match(response.body, /<title>Prodotto \| FastAng<\/title>/);
    }
    const responses = await Promise.all(paths.map((url) => app.inject(url)));
    for (const response of responses) {
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /Risoluzioni in questo layout: 1/);
    }
    const missing = await app.inject('/products/missing');
    assert.equal(missing.statusCode, 404);
    assert.match(missing.body, /data-testid="catalog-layout"/);
    assert.match((await app.inject('/about')).body, /<title>Pagina statica \| FastAng<\/title>/);
  } finally { await app.close(); }
});

test('una guard Angular reindirizza prima del resolver e non carica il prodotto', async () => {
  const app: FastifyInstance = await createProductionServer();
  const apiCalls: string[] = [];
  app.addHook('onRequest', async (request) => { if (request.url.startsWith('/api/products/')) apiCalls.push(request.url); });
  try {
    const response = await app.inject('/products/starter?preview=blocked');
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, '/catalog-access');
    assert.equal(response.headers['x-fastang-render'], 'redirect');
    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(response.body, '');
    assert.deepEqual(apiCalls, []);
    const destination = await app.inject(response.headers.location!);
    assert.equal(destination.statusCode, 200);
    assert.match(destination.body, /Anteprima non disponibile/);
    assert.match(destination.body, /<title>Anteprima non disponibile \| FastAng<\/title>/);
    assert.equal(destination.headers.location, undefined);
  } finally { await app.close(); }
});

test('il redirect Angular preserva query codificate, isola le richieste e ignora Host', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const response = await app.inject({
      url: '/products/starter?preview=blocked&ref=launch%20%26%20news',
      headers: { host: 'external.example' },
    });
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, '/catalog-access?ref=launch%20%26%20news');
    const ordinary = await app.inject('/products/starter?ref=launch+%26+news');
    assert.equal(ordinary.statusCode, 200, 'La sola normalizzazione di + in %20 non è un redirect');
    assert.equal(ordinary.headers.location, undefined);
    const head = await app.inject({ method: 'HEAD', url: '/products/starter?preview=blocked' });
    assert.equal(head.statusCode, 302);
    assert.equal(head.headers.location, '/catalog-access');
    assert.equal(head.body, '');
    const mixed = await Promise.all([
      app.inject('/products/starter?preview=blocked&ref=one'),
      app.inject('/products/workshop'),
      app.inject('/products/starter?preview=blocked&ref=two'),
    ]);
    assert.deepEqual(mixed.map((result) => result.statusCode), [302, 200, 302]);
    assert.deepEqual(mixed.map((result) => result.headers.location), ['/catalog-access?ref=one', undefined, '/catalog-access?ref=two']);
  } finally { await app.close(); }
});

test('brand, immagini e font locali sono distribuiti dal bundle di produzione', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const page = await app.inject('/brand');
    assert.equal(page.statusCode, 200);
    assert.match(page.body, /<title>Brand \| FastAng<\/title>/);
    assert.match(page.body, /Flame Orange/);
    const logo = /src="(\/assets\/fastang-shield[^\"]+\.webp)"/.exec(page.body)?.[1];
    const original = /src="(\/assets\/fastang-original[^\"]+\.jpeg)"/.exec(page.body)?.[1];
    assert.ok(logo);
    assert.ok(original);
    assert.match((await app.inject(logo)).headers['content-type']!, /image\/webp/);
    assert.match((await app.inject(original)).headers['content-type']!, /image\/jpeg/);
    const stylesheet = /href="(\/assets\/[^\"]+\.css)"/.exec(page.body)?.[1];
    assert.ok(stylesheet);
    const css = await app.inject(stylesheet);
    const fonts = [...css.body.matchAll(/url\(["']?(\/assets\/[^)"']+\.woff2)["']?\)/g)].map((match) => match[1]);
    assert.equal(fonts.length, 2);
    for (const font of fonts) assert.equal((await app.inject(font)).statusCode, 200);
  } finally { await app.close(); }
});

test('English SSR, prerender, metadata and guard redirects preserve the locale', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    const responses = await Promise.all(['/en', '/', '/en/author', '/author'].map((url) => app.inject(url)));
    for (const [index, response] of responses.entries()) {
      assert.equal(response.statusCode, 200);
      assert.match(response.body, index % 2 === 0 ? /<html lang="en"/ : /<html lang="it"/);
    }
    const home = responses[0].body;
    assert.match(home, /A solid frontend\./);
    assert.doesNotMatch(home, /Un frontend solido/);
    assert.match(home, /href="\/en\/products\/starter"/);
    assert.match(home, /rel="canonical"[^>]*href="https:\/\/fastang.dev\/en"/);
    assert.match(home, /hreflang="it"[^>]*href="https:\/\/fastang.dev\/"/);
    assert.match(responses[2].body, /Five years\./);
    assert.match(responses[2].body, /<title>Dario Chiapperini, creator \| FastAng<\/title>/);
    assert.match(responses[3].body, /Cinque anni\./);
    const switchPage = await app.inject('/en/products/workshop?ref=launch');
    assert.match(switchPage.body, /href="\/products\/workshop\?ref=launch"/);
    assert.match(switchPage.body, /href="\/en\/products\/workshop\?ref=launch"/);
    const product = await app.inject('/en/products/starter');
    assert.match(product.body, /Angular and Fastify, from your first page/);
    assert.match(product.body, /Resolutions in this layout: 1/);
    assert.match(product.body, /<title>Product \| FastAng<\/title>/);
    const blocked = await app.inject('/en/products/starter?preview=blocked&ref=hello%20world');
    assert.equal(blocked.statusCode, 302);
    assert.equal(blocked.headers.location, '/en/catalog-access?ref=hello%20world');
    const page = await app.inject('/en/about');
    assert.equal(page.headers['x-fastang-render'], 'prerender');
    assert.match(page.body, /Already built/);
    assert.match(page.body, /<html lang="en"/);
    const missing = await app.inject('/en/products/missing');
    assert.equal(missing.statusCode, 404);
    assert.match(missing.body, /This product does not exist/);
    const notFound = await app.inject('/en/not-a-page');
    assert.equal(notFound.statusCode, 404);
    assert.match(notFound.body, /Page not found/);
  } finally { await app.close(); }
});

test('the executable entry starts listen() even when the build has multiple entry points', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  await assert.rejects(promisify(execFile)(process.execPath, [resolve('dist/server/index.js')], {
    env: { ...process.env, PORT: 'invalid' },
  }), (error: any) => {
    assert.match(error.stderr, /PORT deve essere una porta valida/);
    return true;
  });
});

test('documentation is prerendered in both languages and unknown guides return HTTP 404', async () => {
  const { guideNavigation } = await import('../../src/app/docs/navigation');
  const app = await createProductionServer();
  try {
    for (const prefix of ['', '/en']) {
      const index = await app.inject(prefix + '/docs');
      assert.equal(index.statusCode, 200);
      assert.equal(index.headers['x-fastang-render'], 'prerender');
      for (const guide of guideNavigation) {
        const response = await app.inject(prefix + '/docs/' + guide.slug);
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['x-fastang-render'], 'prerender');
        assert.match(response.body, prefix ? /<html lang="en"/ : /<html lang="it"/);
        assert.match(response.body, /aria-current="page"/);
        assert.match(response.body, /<h1>/);
      }
      const unknown = await app.inject(prefix + '/docs/unknown');
      assert.equal(unknown.statusCode, 404);
      assert.match(unknown.body, prefix ? /Guide not found/ : /Guida non trovata/);
    }
  } finally { await app.close(); }
});

test('inherited SSR credentials exclude API responses from native transfer cache', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    for (const headers of [{ cookie: 'sid=private-session' }, { authorization: 'Bearer private-token' }]) {
      const response = await app.inject({ url: '/products/starter', headers });
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /FastAng Starter/);
      const state = JSON.parse(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/.exec(response.body)![1]);
      assert.ok(!Object.values(state).some((entry: any) => entry?.b?.name === 'FastAng Starter'));
      assert.ok(!response.body.includes('private-session'));
      assert.ok(!response.body.includes('private-token'));
    }
  } finally { await app.close(); }
});

test('internal API redirects are HttpClient errors and Set-Cookie responses are not transferred', async () => {
  const app: FastifyInstance = await createProductionServer();
  app.get('/api/products/redirectcase', (_request, reply) => reply.redirect('/about'));
  app.get('/api/products/cookiecase', (_request, reply) => reply.header('set-cookie', [
    'session=server-only; Path=/; HttpOnly',
    'theme=dark; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/',
  ]).send({ id: 'cookiecase', name: 'Cookie case product', description: 'Test product', price: 1, features: [] }));
  try {
    const redirect = await app.inject('/products/redirectcase');
    assert.equal(redirect.statusCode, 502);
    assert.equal(redirect.headers.location, undefined);
    const cookie = await app.inject('/products/cookiecase');
    assert.equal(cookie.statusCode, 200);
    assert.match(cookie.body, /Cookie case product/);
    assert.equal(cookie.headers['set-cookie'], undefined);
    const state = JSON.parse(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/.exec(cookie.body)![1]);
    assert.ok(!Object.values(state).some((entry: any) => entry?.b?.name === 'Cookie case product'));
    assert.ok(!cookie.body.includes('server-only'));
  } finally { await app.close(); }
});

test('versioned documentation serves actual archives and rejects unavailable versions/guides', async () => {
  const app: FastifyInstance = await createProductionServer();
  try {
    for (const prefix of ['', '/en']) {
      const current = await app.inject(prefix + '/docs/v/0-1-0-alpha-3/api');
      const archived = await app.inject(prefix + '/docs/v/0-1-0-alpha-1/api');
      assert.equal(current.statusCode, 200);
      assert.equal(archived.statusCode, 200);
      assert.equal(archived.headers['x-fastang-render'], 'prerender');
      assert.match(current.body, /id="docs-version"/);
      assert.match(current.body, prefix ? /Native route options/ : /Opzioni native della rotta/);
      assert.doesNotMatch(archived.body, prefix ? /Native route options/ : /Opzioni native della rotta/);
      assert.match(archived.body, /0-1-0-alpha-1\/rendering/);
      assert.equal((await app.inject(prefix + '/docs/v/0-1-0-alpha-1/typed-api')).statusCode, 404);
      assert.equal((await app.inject(prefix + '/docs/v/unknown/api')).statusCode, 404);
      assert.equal((await app.inject(prefix + '/docs/v/unknown')).statusCode, 404);
    }
  } finally { await app.close(); }
});
