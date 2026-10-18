# Changelog

## 0.1.0-alpha.5

- Default development Fastify/Vite logging to warn, retain the startup address and allow FASTANG_LOG_LEVEL overrides. Suppress successful dev check summaries with check --quiet.

- Preserve relative dependency symlinks in Vercel functions for pnpm installations.

## 0.1.0-alpha.4

- Add source-only `fastang check` diagnostics for API route/contract correspondence, with tsconfig resolution, JSON and strict mode.
- Run checks before builds and development restarts; share diagnostics with the Vite overlay.

- Bound development server shutdown to three seconds before forced termination.
- Use English for framework diagnostics.

## 0.1.0-alpha.3

- Coordinate the standalone CLI release and starter while preserving runtime APIs.

## 0.1.0-alpha.2

- Accept native Fastify per-route options in API and contract helpers, including typed hooks, body limits, route config and HEAD behavior. File routing and shared contract schemas remain authoritative.

- Add read-only `fastang routes` inspection with page/layout/metadata ancestry and explicit API methods, including versioned JSON output.

- Validate FastAng configuration before starting the development server, using the same loader and checks as production builds.

- Optional TypeBox API contracts infer Fastify handler types and Angular JSON client requests and successful responses.
- Shared contracts reuse runtime schemas, check file-route consistency and encode API URLs explicitly.

## 0.1.0-alpha.1

- Preserve separate Set-Cookie headers and allow explicit per-dispatch forwarding to HTML responses.
- Keep inherited credentials out of Angular's default HTTP transfer cache.
- Treat internal API redirects as HttpClient errors and normalize local dispatch paths.
- Reject Set-Cookie responses during public prerendering.

- Validate prerender and Vercel configuration before changing build output, including plain config exports.
- Reject unknown options, invalid types, reserved paths and conflicting prerender destinations.

## 0.1.0-alpha.0

Initial experimental release.

- File-based Angular pages, nested layouts, route metadata and Fastify APIs.
- Angular SSR, hydration, HTTP transfer cache and per-request rendering state.
- Local API dispatch through Fastify with validation and serialization.
- Development CLI, Node production builds and explicit prerendering.
- Vercel Build Output API adapter with shared or per-route functions.
- Compiled ESM exports and TypeScript declarations, independently installable.

Targets Angular 22.2.3, Vite 8.3.4 and Fastify 5.12.7 or later in the 5.x line.
Node 22.22.3+, 24.15+ and 26+ are supported according to package.json.
The public API is experimental and may change between alpha releases.
