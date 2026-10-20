# FastAng

**Native Angular. Full Fastify.**

A [DacLab](https://github.com/daclab-dev) project, created by Dario Chiapperini.

FastAng is an experimental full-stack framework that brings Angular interfaces, Fastify APIs and server rendering into one project, with clear responsibilities on each side.

**Prototype 0.1 — under active development.** This workspace contains the independently packaged `@fastang/core` runtime and tools, a minimal starter and a working demonstration site. The first alpha is available on npm as `@fastang/core` and `create-fastang` under the `alpha` tag. APIs and conventions may change.

[English tutorials](docs/guide/en/getting-started.md) · [Guide pratiche in italiano](docs/guide/it/getting-started.md) · [Riferimento completo in italiano](README.it.md) · [Contributing](CONTRIBUTING.md) · [License and assets](NOTICE.md)

Project creation and upgrades use the standalone `@fastang/cli` package. Install it with `npm install -g @fastang/cli@alpha`; local core commands handle development and build. See [the CLI guide](docs/cli.md).

## Why FastAng?

After five years working with Angular and Fastify, Dario Chiapperini wanted a full-stack foundation that kept both technologies recognizable. The straightforward experience of Next.js's Pages Router was an influence; Analog was a starting point for exploring an Angular alternative.

FastAng aims for explicit rendering choices, familiar Angular routing and direct access to Fastify plugins, schemas and hooks. It does not claim to outperform Angular SSR, Analog or other frameworks without reproducible benchmarks.

## Run locally

Use Node.js **22.22.3+ in the 22.x line, 24.15+ in the 24.x line, or 26+**, and npm. The lockfile is committed.

```bash
npm ci
npm run dev
```

Open **http://localhost:3278**. The port spells **FAST** on a telephone keypad. Override it with `PORT=4000 npm run dev`; the default host is `127.0.0.1` and can be changed with `HOST`.

This repository is the runnable prototype: clone or download it, install its dependencies and run it directly. No global CLI or npm package is required.

## What works today

- Angular SSR through public rendering APIs, hydration and event replay.
- Fastify endpoints with runtime validation and response serialization.
- File-based pages and APIs, dynamic segments, route groups and catch-alls.
- Nested Angular layouts, route providers, guards, resolvers and titles.
- Per-request rendering context and local API calls through `Fastify.inject()`.
- Explicit prerendering for public URLs.
- Standalone Node deployment and a Vercel Build Output API v3 adapter.
- Separate Vercel functions per page/API path, with component-pruned SSR bundles.
- An Italian/English demo site, including the project story and author page.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with Vite and backend restarts |
| `npm run check` | Generate routes, check API contracts, TypeScript and Angular templates |
| `npm test` | Routing, runtime, HTTP bridge and browser/server boundary tests |
| `npm run build` | Client, standalone Node server and prerendered pages |
| `npm run test:production` | Test the latest production build |
| `npm start` | Run `dist/server/index.js` |
| `npm run build:vercel` | Build the app and generate `.vercel/output` |
| `npm run test:vercel` | Test packaged functions outside the source repository |

`test:production` needs a preceding build. `test:vercel` needs `build:vercel`. Both build commands recreate `dist/`.

## Repository structure

```text
packages/core/         Packaged runtime, Angular renderer, project commands and adapters
packages/cli/          Standalone creation/update CLI
packages/create-fastang/ Project generator with a packaged starter template
examples/starter/      Minimal app, usable outside this repository
scripts/               Asset and integration-test tools
src/app/pages/         Demo Angular pages, layouts and route metadata
src/server/api/        File-based Fastify endpoints
src/server/plugins.ts  Application plugins and hooks
src/shared/            Runtime schemas, types and rendering contracts
src/main.server.ts     Application binding for the shared Angular renderer
fastang.config.ts      Prerender URLs and Vercel options
```

The demo and starter consume the same package. Run `npm run dev:starter` for the minimal app. `npm ci` compiles the workspace package; after changes to `packages/core/src`, run `npm run core:build`. See [the starter guide](examples/starter/README.md) for installation from a local tarball. `npm run test:starter` packs and installs the core and generator outside the workspace, creates an app with the installed CLI, then verifies development restarts, SSR, APIs, prerendering, 404s and a packaged Vercel function. No npm publication is performed.

## Pages and APIs

A standalone component exported from `src/app/pages/contact.page.ts` becomes `/contact`:

```ts
import { Component } from '@angular/core';

@Component({ template: '<h1>Contact</h1>' })
export default class ContactPage {}
```

Use `products/[id].page.ts` for a parameter, `(public)/` for a pathless group, `[...slug].page.ts` for a catch-all and `layout.ts` for a layout containing `RouterOutlet`. Adjacent `*.route.ts` files provide standard Angular metadata, including guards, resolvers and providers.

An endpoint named `src/server/api/hello.get.ts` becomes `GET /api/hello`:

```ts
import { Type } from '@sinclair/typebox';
import { defineApiRoute } from '@fastang/core/api';

export default defineApiRoute<{ Reply: { message: string } }>({
  schema: { response: { 200: Type.Object({ message: Type.String() }) } },
  handler: async () => ({ message: 'Hello from Fastify' }),
});
```

Generated manifests stay out of version control. Run `npm run generate` to refresh them manually. See the [Italian guide](README.it.md) for routing precedence, layouts, request isolation, redirects and transfer-cache details.

## Deployment

For Node, deploy `dist/`, `package.json`, `package-lock.json` and production dependencies installed with `npm ci --omit=dev`, then run `npm start`. The build resolves its files relative to the bundle, independently of the working directory.

For Vercel:

```bash
npm run build:vercel
npm run test:vercel
```

The included `vercel.json` selects the build command. Link your own Vercel project and use its normal deployment flow. Use Node.js 24 for the Vercel build/runtime. No deployment or npm publishing happens in CI.

The adapter places assets and prerendered pages on the CDN. The demo creates separate page/API functions plus fallbacks. Locale aliases share a page function. Each optimized SSR function retains its page, ancestor layouts and real 404 components; route metadata remains available for guards, resolvers and HTTP redirects. The browser keeps the complete router for hydration and later navigation.

```ts
// fastang.config.ts
vercel: {
  functions: 'routes',       // 'shared' uses two aggregate functions
  pagePrefixes: ['', '/en'], // public prefixes added by the app router
  prunePages: true,         // false keeps the full component graph
}
```

`dist/vercel-manifest.json` describes the deployment. `dist/vercel-bundle-report.json` reports uncompressed traced dependency bytes, emitted server JavaScript and page/layout chunks. These are size measurements, not latency or cold-start benchmarks. Packaged handlers are tested locally; a real Vercel Preview deployment remains a separate validation step.

## Current limits

- Experimental alpha packages and generator; no stable compatibility guarantee.
- No ISR/on-demand revalidation, Edge runtime or image optimization.
- No authentication system or route-derived typed API client.
- The Angular HTTP bridge does not support streaming, multipart/binary uploads or automatic propagation of API cookies/redirects into the HTML response.
- SSR HTML is private and not shared-cached. Demo headers and guards are not authentication mechanisms.
- Components imported explicitly by metadata and routes defined manually outside the file manifest cannot be automatically pruned.
- Custom plugins, native modules and dynamically read files need deployment-specific verification.

See [ROADMAP.md](ROADMAP.md) for the next milestones.

## Author and credits

Created by **Dario Chiapperini**, a full-stack developer and consultant based in Piacenza, Italy. Read the story at `/author` or `/en/author`, or visit [dariochiapperini.dev](https://www.dariochiapperini.dev/).

FastAng uses Angular, Fastify and Vite. Its Angular compiler integration is supplied by [`@analogjs/vite-plugin-angular`](https://analogjs.org/docs/packages/vite-plugin-angular/overview); FastAng implements its own runtime and deployment pipeline. It is an independent project.

Source code and documentation are MIT-licensed. Logos and the author photograph are excluded; bundled fonts retain their own licenses. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

## Create a project

Create an app from the npm registry:

```sh
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

To test local package changes before another release:

```sh
npm pack --workspace @fastang/core --pack-destination /tmp
npm run create -- /tmp/my-fastang-app --core-package /tmp/fastang-core-0.1.0-alpha.6.tgz
cd /tmp/my-fastang-app
npm install
npm run dev
```

See [create-fastang](packages/create-fastang/README.md) for naming, optional installation and packaged-generator usage. The destination must be a new directory. Use `npm create fastang@alpha` explicitly: this is an experimental prerelease.

## Typed API contracts

Version `0.1.0-alpha.3` includes optional shared TypeBox contracts that infer Fastify handler inputs/status replies and Angular JSON requests/successful responses. See [the typed greeting example](examples/typed-api/README.md). Existing endpoints and the minimal starter remain usable without this feature.

## Optional authentication example

From a repository checkout, `npm run create:auth -- /path/to/new-app` creates a separate app with login, protected SSR and logout, using official Fastify session and rate-limit plugins. It generates private local secrets and keeps authentication out of the core and minimal npm starter. Read [the example guide](examples/auth/README.md) for startup, Vercel packaging and the limits of the single-account demonstration. Run `npm run test:auth` for browser and packaged-function checks.

## Alpha release preparation

`npm run release:check` runs the release checks and prepares verified tarballs with SHA-512 integrity and source-commit metadata. See [the release guide](docs/releases.md) for publication order, the `alpha` distribution tag and registry smoke tests.

## Performance measurements

`npm run benchmark` builds an isolated production starter and records output sizes, fresh-process startup and HTTP latency for SSR, prerender and API routes. JSON reports include samples and environment metadata. Read [the measurement guide](docs/benchmarks.md) before comparing results; `-- --smoke` checks the harness with fewer samples.

## Public API and supported environments

The [reference](docs/guide/en/reference.md) lists public npm entry points, browser/server import boundaries, declared dependency ranges, automated test coverage and current deployment limits.

## Updating an app and documentation versions

Update the existing app’s `@fastang/core` dependency and align required peers; do not recreate it with the generator. Follow [the upgrade guide](docs/guide/en/upgrading.md). Before v1, the documentation selector exposes only current guides; older alpha sources remain in Git tags. Stable documentation archives start with v1.

## Website analytics

Only the fastang.dev website uses `@vercel/analytics`; the framework and generated
applications do not include tracking. Enable **Web Analytics** for the website's
Vercel project, then redeploy. Production builds collect page views only on
`fastang.dev` and `www.fastang.dev`. Angular completed navigations drive page
views, with automatic tracking disabled to avoid duplicates. Query strings and
URL fragments are removed before sending events. Local and preview hosts do not
collect events. No custom interaction events are configured.

Check **Analytics** in the Vercel project after visiting the deployed website.
Browser blockers can prevent collection. To distinguish future social campaigns,
use supported dashboard referral information; this integration deliberately
strips query parameters, including UTM tags.
