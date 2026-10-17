# Changelog

## Unreleased

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
