# @fastang/core

Experimental FastAng runtime and tooling for Angular + Fastify applications.
Version 0.1.0-alpha.5 is an experimental alpha. Public APIs may change between alpha releases.

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

Both alpha packages are published on npm. The local tarball workflow below can test unpublished changes.

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

See the [public API and support reference](https://fastang.dev/en/docs/reference) for import boundaries, accepted dependency versions and environments covered by tests.

## Standalone CLI

Project creation and upgrades belong to the separate lightweight `@fastang/cli`
package introduced in alpha.3. Core provides `dev`, `build`, `generate`, `routes` and (from alpha.4) `check`.
The global CLI forwards these commands to the app's installed core.

See [CLI behavior and limitations](../../docs/cli.md).

## Static route checks

From `0.1.0-alpha.4`, FastAng includes a route/contract diagnostic command:

```sh
npx fastang check
npx fastang check --json
npx fastang check --strict --project tsconfig.node.json
```

The checker defaults to `tsconfig.node.json`, falling back to `tsconfig.json`.
It uses TypeScript module resolution, including inherited compiler settings,
`paths`, aliases and re-exports. It starts from file-based API routes and checks
only the contract actually passed to `defineContractRoute`; unused contracts
are not treated as missing routes. It never imports application modules, loads
FastAng/Vite configuration, emits files or connects to application services.

Literal strings, const references, object literals and resolvable spreads are
supported. Function calls that construct contracts, mutable variables, wrappers
and unresolved imports produce `FA1003` (unverified), rather than a successful
verification. `--strict` makes these warnings errors. A known method/path mismatch
is `FA1002`; configuration/syntax errors are `FA1000`, and route discovery errors
are `FA1001`. Errors exit with code 1. JSON output has `schemaVersion: 1`, counts
and diagnostics with source positions and a related contract location for
mismatches. `defineApiRoute` needs no contract correspondence check.

This is a source-convention check, not general constant evaluation or a replacement
for TypeScript/Angular checks. Keep method/path definitions declarative; mutations
or side effects elsewhere are not evaluated. Resolving a TS alias here does not
configure runtime aliases. Registration-time validation remains in place.

`fastang build` checks before loading application configuration or clearing build
output. The Vite plugin reuses the checker and reports errors in its terminal and
overlay on route/contract edits; fixing them triggers a full reload. `fastang dev`
checks before restarting the backend and keeps an existing server during an invalid
edit. The standalone CLI delegates `check` to the app's installed core: both need
a release containing this command. Use `0.1.0-alpha.4` or later for both packages.

## Development logging

From `0.1.0-alpha.5`, development defaults to `warn` for both Fastify and Vite during `fastang dev`.
The listening address remains visible. Routine HTTP request/completion logs and
successful route-check summaries are omitted; warnings, errors and failed checks
remain visible. Production logger configuration is unchanged.

Set `FASTANG_LOG_LEVEL=info` or `FASTANG_LOG_LEVEL=debug` in the process environment
when investigating requests. Accepted values are `trace`, `debug`, `info`, `warn`,
`error`, `fatal` and `silent`. Vite maps trace/debug to info and fatal to error.
This controls framework loggers, not application `console.log` calls or package
manager output. The startup address is retained even with `silent`.

`fastang check --quiet` suppresses only a successful text summary; diagnostics
still print, and `--json` always returns the JSON report. The dev supervisor uses
this option for checks before backend restarts. These options are available from `0.1.0-alpha.5`.
