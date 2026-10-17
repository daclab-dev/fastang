import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, staticFile } from '../framework/server';

const options = { template: async () => '<app-root></app-root>', render: async () => '<h1>SSR</h1>' };

test('API con validazione runtime, serializzazione e 404 JSON', async () => {
  const app = await createServer(options);
  try {
    assert.deepEqual((await app.inject('/api/health')).json(), { status: 'ok', framework: 'FastAng' });
    const product = await app.inject('/api/products/starter');
    assert.equal(product.statusCode, 200);
    assert.equal(product.json().name, 'FastAng Starter');
    assert.equal((await app.inject('/api/products/INVALID!')).statusCode, 400);
    assert.equal((await app.inject('/api/products/missing')).statusCode, 404);
    const missing = await app.inject('/api/missing');
    assert.equal(missing.statusCode, 404);
    assert.match(missing.headers['content-type']!, /json/);
    assert.equal((await app.inject('/assets/missing.js')).statusCode, 404);
    assert.equal((await app.inject({ method: 'POST', url: '/missing' })).statusCode, 404);
  } finally { await app.close(); }
});

test('contesti e API interne rimangono isolati sotto concorrenza', async () => {
  const app = await createServer({
    ...options,
    async render(_url, _document, context) {
      const data = await context.dispatchApi('/api/context', 'GET', null, {});
      await new Promise((done) => setTimeout(done, Math.random() * 10));
      return JSON.stringify(data.body);
    },
  });
  try {
    const labels = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan'];
    const responses = await Promise.all(labels.map((label) => app.inject({ url: '/request', headers: { 'x-request-label': label } })));
    responses.forEach((response, index) => {
      assert.equal(response.statusCode, 200);
      assert.deepEqual(JSON.parse(response.body), { label: labels[index] });
      assert.equal(response.headers['cache-control'], 'private, no-store');
    });
  } finally { await app.close(); }
});

test('errori server non espongono stack o dettagli interni', async () => {
  const app = await createServer({ ...options, render: async () => { throw new Error('secret-db-password'); } });
  try {
    const response = await app.inject('/');
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.json(), { error: 'Internal server error' });
  } finally { await app.close(); }
});

test('il prerendering rifiuta percorsi ambigui e traversal', () => {
  assert.equal(staticFile('/about'), 'about/index.html');
  assert.equal(staticFile('/products/starter'), 'products/starter/index.html');
  for (const path of ['/../secret', '/about?x=1', '//host/path', '/%2e%2e', 'relative']) {
    assert.throws(() => staticFile(path), /non supportato/);
  }
});

test('il bridge SSR inoltra JSON, header e stato delle API', async () => {
  const app = await createServer({
    ...options,
    configure(server) {
      server.post('/api/echo', async (request, reply) => {
        reply.code(201);
        return { body: request.body, label: request.headers['x-request-label'] };
      });
    },
    async render(_url, _document, context) {
      const response = await context.dispatchApi('/api/echo', 'POST', { message: 'hello' }, {});
      assert.equal(response.status, 201);
      return JSON.stringify(response.body);
    },
  });
  try {
    const response = await app.inject({ url: '/echo', headers: { 'x-request-label': 'Ada' } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { body: { message: 'hello' }, label: 'Ada' });
  } finally { await app.close(); }
});

test('i redirect SSR inviano Location senza esporre HTML e prevalgono sullo stato della pagina', async () => {
  for (const status of [301, 302, 303, 307, 308] as const) {
    const app = await createServer({
      ...options,
      render: async (_url, _document, context) => {
        context.status = 404;
        context.redirect = { location: '/catalog-access?ref=%E2%9C%93#details', status };
        return '<h1>Contenuto da non inviare nel redirect</h1>';
      },
    });
    try {
      for (const method of ['GET', 'HEAD'] as const) {
        const response = await app.inject({ method, url: '/source' });
        assert.equal(response.statusCode, status);
        assert.equal(response.headers.location, '/catalog-access?ref=%E2%9C%93#details');
        assert.equal(response.headers['cache-control'], 'private, no-store');
        assert.equal(response.body, '');
      }
    } finally { await app.close(); }
  }
});

test('destinazioni esterne, protocol-relative e header injection falliscono senza Location', async () => {
  const invalid = [
    'https://external.example/path', '//external.example/path', '/\\external.example',
    '/ok\r\nX-Injected: true', '/ok\tbad', '/ok\u0000bad', '/a/..//external.example',
  ];
  for (const location of invalid) {
    const app = await createServer({ ...options, render: async (_url, _document, context) => {
      context.redirect = { location };
      return 'private';
    } });
    try {
      const response = await app.inject('/source');
      assert.equal(response.statusCode, 500);
      assert.equal(response.headers.location, undefined);
      assert.equal(response.headers['x-injected'], undefined);
      assert.deepEqual(response.json(), { error: 'Internal server error' });
    } finally { await app.close(); }
  }
});

test('Location normalizza Unicode e rifiuta stati HTTP non appartenenti ai redirect', async () => {
  const app = await createServer({ ...options, render: async (url, _document, context) => {
    Object.assign(context, { redirect: {
      location: '/catalog-access?ref=✓',
      status: new URL(url).searchParams.has('invalid') ? 200 : undefined,
    } });
    return 'private';
  } });
  try {
    const valid = await app.inject('/source');
    assert.equal(valid.statusCode, 302);
    assert.equal(valid.headers.location, '/catalog-access?ref=%E2%9C%93');
    const invalid = await app.inject('/source?invalid');
    assert.equal(invalid.statusCode, 500);
    assert.equal(invalid.headers.location, undefined);
  } finally { await app.close(); }
});
