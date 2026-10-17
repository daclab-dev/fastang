import test from 'node:test';
import assert from 'node:assert/strict';
import { Type } from '@sinclair/typebox';
import { defineApiRoute } from '@fastang/core/api';
import { createApiServer } from '@fastang/core/server';
import { defineApiContract } from '@fastang/core/contracts';
import { defineContractRoute } from '@fastang/core/contract-route';

test('native route hooks, config, limits and HEAD options survive file registration', async () => {
  let handled = 0;
  const app = await createApiServer({ registerApi(server) {
    defineApiRoute<{ Body: { text: string } }, { label: string }>({
      bodyLimit: 64,
      config: { label: 'messages' },
      schema: { body: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } },
      preHandler: [async (request, reply) => {
        assert.equal(typeof request.body.text, 'string');
        assert.equal(request.routeOptions.config.label, 'messages');
        if (request.headers['x-allow'] !== 'yes') return reply.code(403).send({ error: 'Forbidden' });
      }],
      onSend: async (_request, reply, payload) => { reply.header('x-route-hook', 'yes'); return payload; },
      handler: async request => { handled++; return { message: request.body.text }; },
    })(server, 'POST', '/api/messages');
    defineApiRoute({ exposeHeadRoute: false, handler: async () => ({ ok: true }) })(server, 'GET', '/api/no-head');
    defineApiRoute({ handler: async () => ({ ok: true }) })(server, 'GET', '/api/default-head');
  } });
  try {
    const denied = await app.inject({ method: 'POST', url: '/api/messages', payload: { text: 'Hi' } });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.headers['x-route-hook'], 'yes');
    assert.equal(handled, 0);
    const allowed = await app.inject({ method: 'POST', url: '/api/messages', headers: { 'x-allow': 'yes' }, payload: { text: 'Hi' } });
    assert.equal(allowed.statusCode, 200);
    assert.deepEqual(allowed.json(), { message: 'Hi' });
    assert.equal(handled, 1);
    assert.equal((await app.inject({ method: 'POST', url: '/api/messages', payload: { text: 'x'.repeat(100) } })).statusCode, 413);
    assert.equal((await app.inject({ method: 'HEAD', url: '/api/no-head' })).statusCode, 404);
    assert.equal((await app.inject({ method: 'HEAD', url: '/api/default-head' })).statusCode, 200);
  } finally { await app.close(); }
});

test('contract hooks retain inferred inputs, native this binding and authoritative schema', async () => {
  const contract = defineApiContract({ method: 'POST', path: '/api/echo/:id', schema: {
    params: Type.Object({ id: Type.String() }), body: Type.Object({ text: Type.String({ minLength: 1 }) }),
    response: { 200: Type.Object({ message: Type.String() }), 403: Type.Object({ error: Type.String() }) },
  } });
  let handled = 0;
  const app = await createApiServer({ registerApi(server) {
    defineContractRoute(contract, {
      bodyLimit: 64,
      preHandler: async function (request, reply) {
        assert.equal(this, server);
        assert.equal(typeof request.params.id, 'string');
        if (request.params.id === 'blocked') return reply.code(403).send({ error: 'Forbidden' });
      },
      onSend: async (_request, reply, payload) => { reply.header('x-contract-hook', 'yes'); return payload; },
      handler: async request => { handled++; return { message: request.body.text }; },
    })(server, 'POST', '/api/echo/:id');
  } });
  try {
    const denied = await app.inject({ method: 'POST', url: '/api/echo/blocked', payload: { text: 'Hi' } });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.headers['x-contract-hook'], 'yes');
    assert.equal(handled, 0);
    assert.equal((await app.inject({ method: 'POST', url: '/api/echo/ok', payload: { text: '' } })).statusCode, 400);
    assert.equal((await app.inject({ method: 'POST', url: '/api/echo/ok', payload: { text: 'x'.repeat(100) } })).statusCode, 413);
    const allowed = await app.inject({ method: 'POST', url: '/api/echo/ok', payload: { text: 'Hi' } });
    assert.equal(allowed.statusCode, 200);
    assert.deepEqual(allowed.json(), { message: 'Hi' });
    assert.equal(handled, 1);
  } finally { await app.close(); }
});
