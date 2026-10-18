# Contributing to FastAng

FastAng is an early prototype. Small, focused contributions with a reproducible
problem or a clearly described use case are welcome. For architectural changes,
open an issue before investing in a large implementation.

## Development

Use a Node version supported by `package.json`, then run:

```bash
npm ci
npm run dev
```

The app runs at http://localhost:3278. Framework sources live in `packages/core/src/`;
`src/` contains the demo app and its server integration. `examples/starter/` is the minimal consumer. `npm ci` compiles the package; run `npm run core:build` after changing its sources. `packages/create-fastang` contains the generator; `npm run create:build` compiles it and refreshes its template from the starter.

Do not edit generated files in `.fastang/`, `src/app/fastang.routes.ts`, `dist/`
or `.vercel/`. Commit dependency changes with `package-lock.json`.

## Before opening a pull request

```bash
npm test
npm run build
npm run test:production
npm run build:vercel
npm run test:production
npm run test:vercel
npm run test:starter
```

The two build commands both run strict TypeScript and Angular template checks.
For documentation-only changes, check links and examples rather than writing
tests that duplicate the prose.

Describe the concrete problem, resulting behavior and validation. Include a
small reproduction for routing, rendering or deployment changes. Add tests
for meaningful behavior, especially isolation between SSR requests and
browser/server boundaries. Do not introduce benchmark claims without a
reproducible measurement setup.

## Project conventions

- Prefer standard Angular routing, DI and rendering APIs.
- Keep backend modules out of the browser dependency graph.
- Use Fastify's native hooks, schemas and plugin encapsulation.
- Allocate mutable SSR state per application/request, not at module scope.
- Preserve the existing Node deployment when modifying an adapter.
- Keep the English README and Italian guide consistent when behavior changes.

Please keep discussions respectful and focused on the code. Do not include
credentials, private customer data or unpublished code in issues or tests.

Contributions to code and documentation are accepted under the project's MIT
license. Asset exceptions are documented in NOTICE.md.

## Documentation

Public tutorials live in `docs/guide/it` and `docs/guide/en`; the website renders those same files. Keep guide slugs and executable code identical between languages. A fenced TypeScript block annotated with `file=src/...` or `file=fastang.config.ts` is a complete file applied to a fresh starter by `npm run test:docs`. This checks templates, types, rendering and the documented HTTP behavior. Run a subset with `npm run test:docs -- errors configuration` while iterating.

The website supports headings, paragraphs, lists, tables, code fences and inline code/links/strong text. Raw HTML is displayed as text. Keep examples within this subset and include working internal Markdown links.

## Browser tests

```bash
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

This installs both packages from local tarballs into an independent generated app,
adds test-only greeting links, a guard and an API error fallback, and builds it
for production. Playwright checks desktop Chromium, Firefox and WebKit, plus mobile Chromium
and WebKit emulation: SSR DOM reuse,
interactive hydration, HTTP transfer cache, client navigation and history,
redirects, API failures and 404 recovery. Fixtures live in `tests/e2e/fixture`;
they do not alter the published starter. The server uses a temporary port and
closes after the run. It does not reuse or stop a running development server.

CI runs the same command and saves the HTML report, failure screenshots and
traces for seven days. Open a local report with `npx playwright show-report`.
WebKit checks the engine used by Safari; Playwright does not run the branded
Safari browser. Mobile projects emulate devices and do not replace checks on
real iPhones or Android devices.

## Authentication example

`examples/auth` is an optional overlay for the generated starter. Run `npm run create:auth -- /path/to/new-app` to install it, or `npm run test:auth` to check the production example in all configured browser profiles and a packaged Vercel function. API, Origin, cookie and login-limit tests also run under `npm test`. The minimal published starter is unchanged. See [the example guide](examples/auth/README.md) for environment setup and the limits of this single-account demonstration.

Browser test apps add a client-only readiness marker after `afterNextRender` and `ApplicationRef.whenStable()`. Tests wait for it before interacting; the DOM reuse test still captures the SSR element while JavaScript is blocked. This probe is added only to temporary test apps. Filter a run with `npm run test:e2e -- --project=mobile-chromium` or `npm run test:auth -- --project=firefox`.

## Typed API contracts

`tests/contracts-types.ts` contains positive and `@ts-expect-error` checks compiled by `npm run check`. Runtime tests cover URL encoding, Fastify validation/serialization and native HttpClient options/errors. Browser starter tests apply `examples/typed-api` before building and also verify its packaged Vercel SSR function. Copied files in `tests/e2e/fixture` use target-app-relative imports and are type-checked inside that standalone app, rather than by the repository node tsconfig.

## Pull requests and security

Use a feature branch or fork and open a pull request; `main` requires successful
CI and cannot be pushed to directly. Report vulnerabilities through the private
channel in [SECURITY.md](SECURITY.md). Maintainers should follow
[repository operations](docs/repository-operations.md) before approving external
workflow runs, changing permissions or publishing a release.
