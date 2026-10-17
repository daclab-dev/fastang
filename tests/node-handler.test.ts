import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import inject from 'light-my-request';
import { createNodeHandler } from '@fastang/core/node-handler';
import { DEFAULT_PORT } from '@fastang/core/listen';

test('Node function preserves raw bodies, cookies and status while sharing only startup', async () => {
  const app = Fastify();
  app.post('/echo', async (request, reply) => reply.code(201).header('set-cookie', ['one=1; HttpOnly', 'two=2']).send(request.body));
  let starts = 0;
  const handler = createNodeHandler(async () => { starts++; return app; });
  try {
    const responses = await Promise.all(['Ada', 'Grace'].map((name) => inject(handler, {
      method: 'POST', url: '/echo', payload: { name }, headers: { 'content-type': 'application/json' },
    })));
    assert.equal(starts, 1);
    responses.forEach((response, index) => {
      assert.equal(response.statusCode, 201);
      assert.deepEqual(response.json(), { name: index ? 'Grace' : 'Ada' });
      assert.deepEqual(response.headers['set-cookie'], ['one=1; HttpOnly', 'two=2']);
    });
    assert.equal(app.server.listening, false);
    assert.equal(DEFAULT_PORT, 3278);
  } finally { await app.close(); }
});

test('a failed cold start can be retried by the next invocation', async () => {
  let starts = 0;
  const app = Fastify();
  app.get('/', async () => 'ready');
  const handler = createNodeHandler(async () => {
    if (++starts === 1) throw new Error('startup failure');
    return app;
  });
  try {
    const failure = await inject(handler, '/');
    assert.equal(failure.statusCode, 500);
    assert.doesNotMatch(failure.body, /startup failure/);
    assert.equal((await inject(handler, '/')).body, 'ready');
    assert.equal(starts, 2);
  } finally { await app.close(); }
});
