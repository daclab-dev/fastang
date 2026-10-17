// Compile-time checks: tsc must reject these calls or report unused @ts-expect-error.
import { Type } from '@sinclair/typebox';
import type { Observable } from 'rxjs';
import type { HttpClient } from '@angular/common/http';
import { defineApiContract } from '@fastang/core/contracts';
import { defineContractRoute } from '@fastang/core/contract-route';
import { createApiClient } from '@fastang/core/http-client';

function check(http: HttpClient) {
  const api = createApiClient(http);
  const contract = defineApiContract({ method: 'POST', path: '/api/messages/:id', schema: {
    params: Type.Object({ id: Type.String() }), body: Type.Object({ text: Type.String() }),
    response: { 201: Type.Object({ message: Type.String() }), 404: Type.Object({ error: Type.String() }) },
  } });
  const response: Observable<{ message: string }> = api.request(contract, { params: { id: 'one' }, body: { text: 'Hi' } });
  // @ts-expect-error missing required parameters and body
  api.request(contract);
  // @ts-expect-error incorrect body type
  api.request(contract, { params: { id: 'one' }, body: { text: 42 } });
  // @ts-expect-error incorrect parameter name
  api.request(contract, { params: { name: 'one' }, body: { text: 'Hi' } });
  // @ts-expect-error error responses are not successful Observable values
  const wrong: Observable<{ error: string }> = response;
  defineContractRoute(contract, { handler: async (request, reply) => {
    const text: string = request.body.text;
    // @ts-expect-error response type is tied to the HTTP status
    reply.code(404).send({ message: text });
    // @ts-expect-error handler body is inferred from its schema
    request.body.notInSchema;
    return reply.code(201).send({ message: text });
  } });
  const search = defineApiContract({ method: 'GET', path: '/api/search', schema: {
    querystring: Type.Object({ page: Type.Optional(Type.Number()) }),
    response: { 200: Type.Array(Type.String()) },
  } });
  const results: Observable<string[]> = api.request(search, { query: { page: 2 } });
  api.request(search, { query: {} });
  // @ts-expect-error query values are inferred from their schema
  api.request(search, { query: { page: 'two' } });
  // @ts-expect-error a declared query schema requires its request object
  api.request(search);
  const ping = defineApiContract({ method: 'GET', path: '/api/ping', schema: { response: { 200: Type.Boolean() } } });
  const ok: Observable<boolean> = api.request(ping);
  // @ts-expect-error a body cannot be passed to a bodyless request
  api.request(ping, { body: 'unexpected' });
  return [wrong, ok, results];
}
void check;
