# Public API and support reference

This reference describes `0.1.0-alpha.4`. All FastAng APIs are experimental:
being exported makes an API public, not stable across alpha releases. Pin the
core and generator to matching versions when reproducing a project.

## Public package entry points

| Import | Context | API |
| --- | --- | --- |
| `@fastang/core` | Node | `defineApiRoute`, config, server factories, Node handler, listen, rendering types |
| `@fastang/core/api` | Node | `defineApiRoute`, `ApiRouteOptions` |
| `@fastang/core/config` | Configuration | `defineConfig`, `validateConfig`, `validateVercelOptions` and config types |
| `@fastang/core/server` | Node | `createServer`, `createApiServer`, `staticFile`, renderer/server option types |
| `@fastang/core/http-server` | Node | `createHttpServer`, `HttpServerOptions` |
| `@fastang/core/node-handler` | Node | `createNodeHandler` |
| `@fastang/core/listen` | Node | `listen`, `DEFAULT_PORT` |
| `@fastang/core/angular` | Angular SSR | `createRenderer` |
| `@fastang/core/render-context` | Types | `RenderContext`, `ApiDispatchOptions`, `ApiDispatchResult` |
| `@fastang/core/contracts` | Browser + SSR | `defineApiContract`, `apiUrl` and inferred contract types |
| `@fastang/core/contract-route` | Node | `defineContractRoute` |
| `@fastang/core/http-client` | Angular browser + SSR | `createApiClient`, `injectApiClient`, `ApiRequestOptions` |
| `@fastang/core/redirect` | Browser + SSR | `normalizeRedirectLocation` |
| `@fastang/core/vite` | Build | `defineFastangConfig` |
| `@fastang/core/routes` | Tooling | Discovery, page trees, generation, inspection and route types |
| `@fastang/core/vite-plugin` | Tooling | `fastang`, `isServerModule` |
| `@fastang/core/adapters/vercel-plan` | Tooling | Function planning, route patterns and deployment plan types |
| `@fastang/core/adapters/vercel` | Tooling | `buildVercelOutput` |

Use these package paths instead of importing `dist/`, `src/` or internal command
modules. The tooling entry points expose implementation-oriented APIs and are
especially likely to change. A module being present in a tarball does not make
it an independently supported import path.

The root runtime import is server-only. For Angular code, use `/http-client` and
`/contracts` as appropriate. `/angular` configures server rendering, not browser
bootstrap. Use `import type` for server/rendering types consumed by Angular so
those imports are erased. The Vite boundary check rejects runtime server imports
in browser bundles, including through another module.

## Runtime and dependency matrix

| Package | Accepted range |
| --- | --- |
| Node.js | `^22.22.3 / ^24.15.0 / >=26.0.0` |
| `@angular/common` | `22.2.3` |
| `@angular/compiler` | `22.2.3` |
| `@angular/core` | `22.2.3` |
| `@angular/platform-browser` | `22.2.3` |
| `@angular/platform-server` | `22.2.3` |
| `@angular/router` | `22.2.3` |
| `fastify` | `^5.12.7` |
| `rxjs` | `^7.8.2` |
| `tslib` | `^2.8.1` |
| `vite` | `8.3.4` |
| `typescript` | `~6.0.2` |
| `@angular/compiler-cli` | `22.2.3` |
| `@angular/build` | `22.2.3` |
| `@sinclair/typebox` | `^0.34.41` |

The Node.js alternatives in the first row are separated by `/`. These are the
package engine and peer ranges, not a claim that every future matching version
has been tested. All Angular peers are pinned together. TypeBox is an optional
peer: install it when using shared contracts. Other peers are required by the
application/tooling setup. Runtime dependencies owned by the core are installed
with it; the table is not a list of every transitive package.

CI runs the production app on Linux with Node 22.22.3, 24.15.0 and the Node 26
line. Browser tests cover Chromium, Firefox and WebKit, plus Pixel 7 Chromium and
iPhone 13 WebKit emulation. They verify the generated starter and authentication
example; emulation is not a real-device test. macOS, Windows, Bun, Deno and other
Node versions do not have equivalent automated coverage in this repository.

## Deployment and rendering scope

| Target | Current scope |
| --- | --- |
| Node server | Fastify HTTP server, SSR, APIs, explicit public prerender URLs, graceful signal shutdown |
| Vercel | Build Output API v3, Node.js 24 functions, shared or per-route functions, CDN assets and prerendered HTML |
| Edge runtimes | No adapter |
| Static-only export | No complete server-free application export |
| ISR and revalidation | Not implemented |
| Angular HTML streaming | Complete HTML is produced before the SSR response is sent |

By default, SSR responses are private and uncached by shared caches; prerendered HTML is
public. Concrete prerender URLs are listed in config; `/` and runtime namespaces
remain reserved. Development renders those pages on demand. See
[rendering](rendering.md) for data and cache behavior and [deployment](deployment.md)
for output layout and Vercel configuration.

Node/Vercel packaging checks run in CI, and the documentation site is deployed
on Vercel. This is not blanket compatibility for every plugin or deployment:
native addons, dynamically read files and external services need verification in
the consuming app. The optional session example supplies its own native-addon
packaging step. Edge support cannot be inferred from the use of Vite or Angular.

## CLI contract

```sh
npx fastang --help
npx fastang generate
npx fastang routes --json
npx fastang dev
npm run build
npm run build:vercel
```

`generate` writes discovered Angular/API registration modules. `routes` reads the
file map without executing application modules or writing files; `--json` emits
a `schemaVersion: 1` document. `dev` validates config, starts Vite/Fastify and
restarts the backend when watched server/shared/config files change. The default
port is 3278; `PORT` and `HOST` override it.

The starter's build scripts run Angular/TypeScript checks before calling
`fastang build` or `fastang build --vercel`. The raw CLI build command does not
replace those checks. Build configuration validation happens before replacing
`dist/`. `fastang.config.ts` and the application bindings supplied by the starter
are required; this is not a drop-in CLI for arbitrary Angular workspaces.

## Ownership and compatibility boundaries

FastAng owns file discovery, Angular/Fastify integration, local SSR HTTP dispatch
and adapter output. Angular owns routing, DI, HttpClient and hydration. Fastify
owns API hooks, parsing, validation, serialization and plugin behavior. Typed
contracts add schema-derived types; they do not introduce a second router or RPC
transport. The [typed API guide](typed-api.md) documents their narrower JSON scope.

Session policy, identity providers, persistent storage, authorization, background
jobs and distributed state belong to the application or its services. Shared and
per-route Vercel functions do not share process memory. Read the
[SSR HTTP contract](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions)
for credentials, cookies and redirects.

## CLI route checks

`fastang check [--project <tsconfig>] [--json] [--strict]` checks route/contract correspondence without application execution. See [typed APIs](typed-api.md#static-route-checks).
