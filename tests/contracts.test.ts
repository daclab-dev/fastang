import test from 'node:test';
import assert from 'node:assert/strict';
import { Type } from '@sinclair/typebox';
import { defineApiContract, apiUrl } from '@fastang/core/contracts';
import { defineContractRoute } from '@fastang/core/contract-route';
import { createHttpServer } from '@fastang/core/http-server';

const greeting = defineApiContract({ method: 'GET', path: '/api/greet/:name', schema: {
  params: Type.Object({ name: Type.String({ minLength: 1, maxLength: 80 }) }),
  response: { 200: Type.Object({ message: Type.String() }, { additionalProperties: false }) },
} });

test('contract URL encoding preserves segments and repeated flat query values', () => {
  const contract = defineApiContract({ ...greeting, schema: { ...greeting.schema, querystring: Type.Object({ tag: Type.Array(Type.String()), page: Type.Optional(Type.Number()), active: Type.Boolean() }) } });
  assert.equal(apiUrl(contract, { params: { name: 'Ada /?%✓' }, query: { tag: ['a&b', 'c'], active: false } }), '/api/greet/Ada%20%2F%3F%25%E2%9C%93?tag=a%26b&tag=c&active=false');
  for (const name of ['', '.', '..', {}, Infinity]) assert.throws(() => apiUrl(greeting, { params: { name } } as never));
  assert.throws(() => apiUrl(greeting, { params: {} } as never));
  assert.throws(() => apiUrl(greeting, { params: { name: 'Ada', extra: 'ignored' } } as never));
  assert.throws(() => apiUrl({ ...greeting, path: 'https://external.example' }, { params: { name: 'Ada' } }));
});

test('contract definitions reject ambiguous paths, status maps and parameter mismatches', () => {
  for (const path of ['/api/greet/:other', '/api/greet/:name/:name', '/api/../private', '/api/test?x=1', '//external/api/test']) {
    assert.throws(() => defineApiContract({ ...greeting, path }));
  }
  assert.throws(() => defineApiContract({ ...greeting, schema: { ...greeting.schema, response: { 404: Type.String() } } }));
  assert.throws(() => defineApiContract({ ...greeting, schema: { ...greeting.schema, body: Type.String() } }));
});

test('contract routes retain native Fastify validation, serialization and status replies', async () => {
  const contract = defineApiContract({ method: 'POST', path: '/api/messages/:id', schema: {
    params: Type.Object({ id: Type.String({ pattern: '^[a-z]+$' }) }),
    body: Type.Object({ text: Type.String({ minLength: 1 }) }),
    response: { 201: Type.Object({ message: Type.String() }, { additionalProperties: false }), 404: Type.Object({ error: Type.String() }) },
  } });
  const route = defineContractRoute(contract, { handler: async (request, reply) => {
    if (request.params.id === 'missing') return reply.code(404).send({ error: 'Missing' });
    const result = { message: request.body.text, secret: 'server-only' };
    return reply.code(201).send(result);
  } });
  const app = await createHttpServer();
  try {
    assert.throws(() => route(app, 'GET', '/api/messages/:id'), /contract mismatch/);
    assert.throws(() => route(app, 'POST', '/api/messages/:other'), /contract mismatch/);
    route(app, 'POST', '/api/messages/:id');
    const result = await app.inject({ method: 'POST', url: '/api/messages/hello', payload: { text: 'Hello' } });
    assert.equal(result.statusCode, 201); assert.deepEqual(result.json(), { message: 'Hello' });
    assert.equal((await app.inject({ method: 'POST', url: '/api/messages/INVALID', payload: { text: 'Hello' } })).statusCode, 400);
    assert.equal((await app.inject({ method: 'POST', url: '/api/messages/hello', payload: { text: '' } })).statusCode, 400);
    assert.equal((await app.inject({ method: 'POST', url: '/api/messages/missing', payload: { text: 'Hello' } })).statusCode, 404);
  } finally { await app.close(); }
});


test('typed Angular requests use the native backend and preserve per-request options', async () => {
  await import('@angular/compiler');
  const { HttpClient, HttpResponse, HttpErrorResponse, HttpContext } = await import('@angular/common/http');
  const { of, firstValueFrom, throwError } = await import('rxjs');
  const { createApiClient } = await import('@fastang/core/http-client');
  const context = new HttpContext();
  const http = new HttpClient({ handle(request) {
    assert.equal(request.method, 'GET');
    assert.equal(request.urlWithParams, '/api/greet/Ada%20Lovelace');
    assert.equal(request.headers.get('x-request-label'), 'test');
    assert.equal(request.context, context);
    assert.equal(request.transferCache, false);
    return of(new HttpResponse({ body: { message: 'Hello, Ada Lovelace!' } }));
  } });
  assert.deepEqual(await firstValueFrom(createApiClient(http).request(greeting, { params: { name: 'Ada Lovelace' } }, {
    headers: { 'x-request-label': 'test' }, context, transferCache: false,
  })), { message: 'Hello, Ada Lovelace!' });
  const failure = new HttpErrorResponse({ status: 401, error: { error: 'Unauthorized' } });
  const failing = new HttpClient({ handle: () => throwError(() => failure) });
  await assert.rejects(firstValueFrom(createApiClient(failing).request(greeting, { params: { name: 'Ada' } })), error => error === failure);
});
