import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { createServer } from '@fastang/core/server';

const base = { template: async () => '<app-root></app-root>', render: async () => '<p>ok</p>' };

test('SSR deadline covers template loading and never starts the renderer afterwards', { timeout: 5_000 }, async () => {
  let renderCount = 0;
  let finish!: (html: string) => void;
  const app = await createServer({ ...base, renderTimeoutMs: 25,
    template: () => new Promise(resolve => { finish = resolve; }),
    render: async () => { renderCount++; return 'late'; },
  });
  try {
    const response = await app.inject('/');
    assert.equal(response.statusCode, 504);
    assert.deepEqual(response.json(), { error: 'SSR rendering timed out' });
    assert.equal(response.headers['cache-control'], 'private, no-store');
    finish('late template');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(renderCount, 0);
  } finally { await app.close(); }
});

test('timed-out dispatch aborts its transport, discards cookies and leaves concurrent renders isolated', { timeout: 5_000 }, async () => {
  let release!: () => void;
  let aborted = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const app = await createServer({ ...base, renderTimeoutMs: 80,
    configure(app) {
      app.get('/api/slow', async (request, reply) => {
        request.raw.once('error', () => { aborted = true; });
        await gate;
        return reply.header('set-cookie', 'secret=late').send({ ok: true });
      });
    },
    async render(url, _document, context) {
      if (new URL(url).pathname === '/slow') {
        await context.dispatchApi('/api/slow', 'GET', null, {}, { forwardSetCookie: true });
      }
      return 'healthy';
    },
  });
  try {
    const [slow, healthy] = await Promise.all([app.inject('/slow'), app.inject('/healthy')]);
    assert.equal(slow.statusCode, 504);
    assert.equal(slow.headers['set-cookie'], undefined);
    assert.equal(healthy.statusCode, 200);
    assert.equal(healthy.body, 'healthy');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(aborted, true);
    release();
    const next = await app.inject('/healthy');
    assert.equal(next.headers['set-cookie'], undefined);
  } finally { release(); await app.close(); }
});

test('closing the server aborts active SSR and does not wait for an uncooperative renderer', { timeout: 5_000 }, async () => {
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  let signal!: AbortSignal;
  const app = await createServer({ ...base, renderTimeoutMs: 10_000,
    render: async (_url, _document, context) => { signal = context.signal!; started(); return new Promise(() => {}); },
  });
  const request = app.inject('/');
  await ready;
  await app.close();
  assert.equal(signal.aborted, true);
  assert.equal((await request).statusCode, 503);
});

test('a disconnected HTTP client aborts only its own render', { timeout: 5_000 }, async () => {
  let started!: () => void;
  let cancelled!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const aborted = new Promise<void>(resolve => { cancelled = resolve; });
  const app = await createServer({ ...base,
    render: async (url, _document, context) => {
      if (new URL(url).pathname !== '/slow') return 'healthy';
      context.signal!.addEventListener('abort', cancelled, { once: true });
      started();
      return new Promise(() => {});
    },
  });
  try {
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    const request = get(address + '/slow');
    request.on('error', () => {});
    await ready;
    request.destroy();
    await aborted;
    assert.equal((await app.inject('/healthy')).statusCode, 200);
  } finally { await app.close(); }
});

test('SSR deadline rejects invalid configuration before creating the server', { timeout: 5_000 }, async () => {
  for (const renderTimeoutMs of [0, -1, NaN, Infinity, 1.5, 2 ** 31]) {
    await assert.rejects(createServer({ ...base, renderTimeoutMs }), /renderTimeoutMs/);
  }
});

test('a failed render discards cookies and redirects queued before the deadline', { timeout: 5_000 }, async () => {
  const app = await createServer({ ...base, renderTimeoutMs: 50,
    configure(app) { app.get('/api/cookie', async (_request, reply) => reply.header('set-cookie', 'session=private').send({ ok: true })); },
    async render(_url, _document, context) {
      await context.dispatchApi('/api/cookie', 'GET', null, {}, { forwardSetCookie: true });
      context.redirect = { location: '/private' };
      return new Promise(() => {});
    },
  });
  try {
    const response = await app.inject('/');
    assert.equal(response.statusCode, 504);
    assert.equal(response.headers['set-cookie'], undefined);
    assert.equal(response.headers.location, undefined);
  } finally { await app.close(); }
});

test('individual dispatch cancellation permits another dispatch in the same render', { timeout: 5_000 }, async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const app = await createServer({ ...base,
    configure(app) {
      app.get('/api/wait', async () => { await gate; return { late: true }; });
      app.get('/api/ready', async () => ({ ok: true }));
    },
    async render(_url, _document, context) {
      const controller = new AbortController();
      const reason = new Error('individual cancellation');
      const waiting = context.dispatchApi('/api/wait', 'GET', null, {}, { signal: controller.signal });
      controller.abort(reason);
      await assert.rejects(waiting, error => error === reason);
      assert.equal(context.signal!.aborted, false);
      return JSON.stringify((await context.dispatchApi('/api/ready', 'GET', null, {})).body);
    },
  });
  try {
    const response = await app.inject('/');
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally { release(); await app.close(); }
});
