# Shared typed API contracts

From `0.1.0-alpha.2`, a shared TypeBox contract can infer Fastify handler types
and Angular JSON request/response types from the same runtime schemas. This is
optional: the minimal starter and `defineApiRoute()` work without TypeBox.

## Install the optional schema library

```sh
npm install @sinclair/typebox@^0.34.41
```

Start with the generated starter. Keep its greeting page and replace the following
files. Shared modules must not import server code or secrets.

## Define the contract

```ts file=src/shared/greeting.ts
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

The path must match the generated API route exactly. Params, query strings and
JSON bodies are validated by Fastify; response schemas control serialization.
Changing the contract does not generate or rename route files.

## Register the Fastify handler

```ts file=src/server/api/greet/[name].get.ts
import { defineContractRoute } from '@fastang/core/contract-route';
import { greetingContract } from '../../../shared/greeting';

export default defineContractRoute(greetingContract, {
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
```

`request.params.name` is inferred as a string. Native Fastify route options such
as `preHandler` and `bodyLimit` are supported. Method, URL and schema cannot be
overridden in options. Declare error response statuses in the contract if hooks
or handlers send them.

## Call it through Angular

```ts file=src/app/pages/greet/[name].route.ts
import type { ResolveFn } from '@angular/router';
import { injectApiClient } from '@fastang/core/http-client';
import type { ApiSuccess } from '@fastang/core/contracts';
import { greetingContract } from '../../../shared/greeting';

const greeting: ResolveFn<ApiSuccess<typeof greetingContract>> = route =>
  injectApiClient().request(greetingContract, { params: { name: route.paramMap.get('name')! } });

export default { title: 'Greeting · FastAng', resolve: { greeting } };
```

`injectApiClient()` uses Angular HttpClient, so interceptors, SSR local dispatch
and hydration caching continue to apply. `ApiSuccess` is the union of successful
2xx response bodies. HTTP failures remain native `HttpErrorResponse` objects;
they do not become successful values.

Visit `/greet/world`: the existing page receives `{ message: 'Hello, world!' }`
through its resolver input. The [rendering guide](rendering.md) explains the SSR
and hydration flow.

## Boundaries

Use `schema.querystring` for a query object and pass `query` to the client;
use `schema.body` and pass `body` for JSON input. Every declared input schema
requires its corresponding request field, even if its properties are optional.
Path params are encoded; flat query arrays become repeated keys. Nested query
objects are not supported.

Contracts currently support GET, POST, PUT, PATCH and DELETE with static/named
local `/api/...` paths and JSON body responses. For wildcard routes, uploads,
streaming, progress or full response observation, use native HttpClient and
`defineApiRoute()`. Browser response types are not runtime response validation:
client/server version skew still needs application handling. See the
[SSR HTTP contract](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions)
for credential and cache behavior.
