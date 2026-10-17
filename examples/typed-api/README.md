# Typed API contracts (unreleased)

Available on the repository main branch, planned for the next alpha. npm
`0.1.0-alpha.1` does not include these exports yet. The minimal published starter
continues to work without contracts or TypeBox.

This overlay replaces the starter greeting endpoint and resolver and adds one
shared contract. Copy its `src/` over a starter using a local tarball of the
current core. Install `@sinclair/typebox@^0.34.41` in that app, then build it.
Use `npm run test:e2e` from the repository to verify the same overlay as an
independent packaged installation in Chromium, Firefox and WebKit and in a
packaged Vercel SSR function. The browser test fixture additionally supplies its
existing guard and error fallback.

## One contract

`src/shared/greeting.ts` contains the method, URL and public TypeBox schemas.
The TypeScript request and response types are inferred from those schemas;
there is no parallel handwritten interface.

```ts
import { Type } from '@sinclair/typebox';
import { defineApiContract } from '@fastang/core/contracts';

export const greetingContract = defineApiContract({
  method: 'GET', path: '/api/greet/:name',
  schema: {
    params: Type.Object({ name: Type.String({ minLength: 1, maxLength: 80 }) }),
    response: { 200: Type.Object({ message: Type.String() }, { additionalProperties: false }) },
  },
});
```

TypeBox is an optional peer dependency for this feature. The core contracts
module imports TypeBox types only; it does not run a client-side validator.
Shared contract modules must contain public schemas and descriptors, never
credentials, server handlers or imports from `src/server`.

## Fastify handler

```ts
import { defineContractRoute } from '@fastang/core/contract-route';
import { greetingContract } from '../../../shared/greeting';

export default defineContractRoute(greetingContract, {
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
```

`request.params.name` is inferred as a string. Fastify performs its normal runtime
validation, coercion and response serialization. Response types are indexed by
HTTP status, so `reply.code(404).send(...)` must match the declared 404 schema.
The file must remain `src/server/api/greet/[name].get.ts`: a mismatch between
file-derived method/path and the contract fails registration. Contracts do not
create a second routing system. The server helper is blocked from browser builds.

## Angular request

In an Angular injection context:

```ts
const api = injectApiClient();
return api.request(greetingContract, { params: { name: 'Ada Lovelace' } });
// Observable<{ message: string }>
```

Import `injectApiClient` from `@fastang/core/http-client`. Outside injection
contexts, use `createApiClient(httpClient)` with an injected native HttpClient.
Requests use Angular's existing interceptors, HttpContext, HTTP backend and native
transfer cache. The optional third argument supports `headers`, `context`,
`withCredentials`, fetch `credentials` and `transferCache`.

For private reads:

```ts
api.request(greetingContract, { params: { name: 'Ada' } }, { transferCache: false });
```

`ApiSuccess<typeof contract>` infers successful 2xx bodies; errors remain Angular
HttpErrorResponse objects. Types are not runtime response validation: client/server
version skew and untrusted response bodies still require application handling.
The existing SSR cookie and redirect contract continues to apply.

## Body and query schemas

Put JSON body schemas under `schema.body`, query object schemas under
`schema.querystring`, and supply `{ body, query, params }` as needed. Fields with
schemas are required in the request object, even when every query property is
optional (pass `query: {}`). A contract with none needs no request object.

URL encoding supports scalar string/number/boolean parameters and flat query
values, including arrays serialized as repeated keys. Undefined query values are
omitted; nested objects, null, non-finite numbers and empty/dot path segments are
rejected. Query parsing and coercion remain Fastify configuration concerns.

The first version covers JSON body responses, GET/POST/PUT/PATCH/DELETE, and local
`/api/...` static or named path segments. GET bodies, wildcard paths, streaming,
uploads, progress events and response observation are outside this helper. Use
native HttpClient and `defineApiRoute` for those needs. There is no contract
code generation, hidden RPC layer or change to file-based routing.

References: [TypeBox](https://github.com/sinclairzx81/typebox),
[Angular HttpClient](https://angular.dev/api/common/http/HttpClient).
