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
