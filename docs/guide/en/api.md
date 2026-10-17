# Fastify APIs and validation

Register typed endpoints with runtime schemas and use native Fastify requests and replies.

## Names and methods

`src/server/api/health.get.ts` becomes `GET /api/health`. Supported suffixes are `get`, `post`, `put`, `patch`, `delete`, `head` and `options`. `[name]` creates a dynamic parameter; files without a method remain helpers and are not registered.

## Create a POST endpoint

Add this file to the starter. The TypeScript type describes the handler body; the schema validates it at runtime and defines the serialized response.

```ts file=src/server/api/messages.post.ts
import { defineApiRoute } from '@fastang/core';

export default defineApiRoute<{ Body: { text: string } }>({
  schema: {
    body: {
      type: 'object', required: ['text'], additionalProperties: false,
      properties: { text: { type: 'string', minLength: 1, maxLength: 120 } },
    },
    response: {
      201: {
        type: 'object', required: ['message'],
        properties: { message: { type: 'string' } },
      },
    },
  },
  handler: async (request, reply) => reply.code(201).send({ message: request.body.text.trim() }),
});
```

## Try the response

```bash
curl -i -X POST http://localhost:3278/api/messages \
  -H 'content-type: application/json' \
  -d '{"text":"Hello"}'
```

The response is HTTP 201 with `{"message":"Hello"}`. A missing `text`, an empty string or a value longer than 120 characters returns HTTP 400. TypeScript types alone do not validate external requests.

## Use Fastify

The handler receives native `request` and `reply`: read parameters and headers or set the status. Register shared plugins and hooks in `src/server/plugins.ts`. The initial body limit is 1 MiB. Internal errors do not expose stacks to the client; unknown API endpoints return JSON with HTTP 404.

Do not import `src/server` modules into Angular components. Share types through a module without server dependencies and use type-only imports where possible. This alpha does not generate a route-typed API client yet.

Continue with [resolvers and SSR](rendering.md). Read more about [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

## Native route options (next alpha)

On main, `defineApiRoute()` accepts native Fastify route options such as
`preHandler`, hook arrays, `onSend`, `bodyLimit`, `config`, `exposeHeadRoute` and
route error handlers. The following example requires the next alpha; it is not
included in npm `0.1.0-alpha.1`.

```ts file=src/server/api/limited.post.ts
import { defineApiRoute } from '@fastang/core';

export default defineApiRoute<{ Body: { text: string } }>({
  bodyLimit: 64,
  schema: {
    body: {
      type: 'object', required: ['text'],
      properties: { text: { type: 'string' } },
    },
  },
  preHandler: async request => { request.body.text = request.body.text.trim(); },
  onSend: async (_request, reply, payload) => {
    reply.header('x-route-example', 'limited');
    return payload;
  },
  handler: async request => ({ message: request.body.text }),
});
```

`POST /api/limited` trims the validated body and adds a response header. A JSON
body larger than 64 bytes returns HTTP 413. Hook ordering, short-circuit replies,
validation and error behavior remain Fastify's. Ordinary function hooks retain
Fastify's `this` binding; arrow functions use normal JavaScript lexical binding.

Method and URL always come from the filename and cannot be supplied as options.
`defineContractRoute()` accepts the same options, with request/reply types inferred
in hooks, but its schema always comes from the shared contract. Its error replies
must match the statuses declared there. Keep plugin-specific option types in the
plugin's Fastify type augmentation. A second generic parameter can describe a
custom route `config` object. Schema-less routes are allowed, as in native Fastify;
TypeScript types alone never validate input.
