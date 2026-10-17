# @fastang/core

Experimental FastAng runtime and tooling for Angular + Fastify applications.
Version 0.1.0-alpha.2 is an experimental alpha. Public APIs may change between alpha releases.

The package contains compiled JavaScript and TypeScript declarations. Angular,
Fastify, Vite and the Angular compiler are explicit peer dependencies so the app
uses one instance of each runtime.

## Installation

Create an app using the matching generator release:

```sh
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Registry installation is available once both alpha packages have been published. The local tarball workflow below also works before publication.

## Public entry points

- `@fastang/core`: API definitions, configuration, HTTP server factories, Node handler, listen and rendering context types.
- `@fastang/core/angular`: `createRenderer(RootComponent, createAppConfig)` with per-request providers, HTTP transfer cache and router redirects.
- `@fastang/core/vite`: `defineFastangConfig()` for Angular compilation, generated routes and server/client boundaries.
- `@fastang/core/config`, `/api`, `/server`, `/http-server`, `/node-handler`, `/listen`, `/render-context`: focused imports.
- `/contracts`, `/contract-route`, `/http-client`: optional shared TypeBox contracts, Fastify registration and Angular JSON requests (from `0.1.0-alpha.2`). Install `@sinclair/typebox` to use contracts.
- `/routes`, `/adapters/vercel`, `/adapters/vercel-plan`, `/vite-plugin`: lower-level tooling APIs; still experimental.

`createServer()` and `createApiServer()` accept a `registerApi(app)` callback.
The framework never imports application files; the generated `.fastang/api.ts`
module belongs to the consuming app.

## Commands

`fastang generate` generates routes in the current application. `fastang dev`
starts Vite and Fastify on port 3278 and restarts the backend after changes.
`fastang build` builds the client, Node server and explicit prerender URLs.
`fastang build --vercel` also creates the Vercel Build Output API directory.
Run Angular and TypeScript checks before a build, as shown in the starter.

The current conventions expect `fastang.config.ts`, `vite.config.ts`,
`src/main.server.ts`, `src/server/{index,start,api-entry,vercel-entry,plugins}.ts`
and `src/app/omitted.server.ts`. The starter supplies these application bindings.

To build and create a tarball from the repository root:

```sh
npm ci
npm pack --workspace @fastang/core --pack-destination /tmp
```

Install the tarball into a copy of `examples/starter`. No global CLI, repository
source files or website assets are required by the installed package.

## Inspect file routes

From `0.1.0-alpha.2`, `fastang routes` lists page paths in matching order with their source
files, ancestor layouts and metadata files, followed by explicit API methods.
Use `fastang routes --json` for a JSON document with `schemaVersion: 1`, `pages`
and `api` arrays.

Inspection uses the same discovery and collision checks as generation. It does
not import application modules, evaluate configuration, write generated files,
build the app or start a server. Paths describe file conventions: custom Angular
router prefixes, routes registered by plugins and Fastify's implicit HEAD routes
are not included. `**` denotes an Angular catch-all; API catch-alls use `*`.
The output does not report prerendering or deployment-function assignment.

## Native API route options

From `0.1.0-alpha.2`, `defineApiRoute()` forwards native Fastify route options, including hooks,
`bodyLimit`, `config`, `exposeHeadRoute` and route error handlers. Method and URL
remain controlled by file routing. Hooks preserve the request/reply generic types;
a second generic describes custom route config. Schemas are optional, as in
Fastify. `defineContractRoute()` from `/contract-route` accepts the same options,
except that its schema comes from the shared contract.
