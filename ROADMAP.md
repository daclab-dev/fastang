# Roadmap

This is a direction for the prototype, not a release schedule or compatibility
promise. Track concrete work in repository issues once the project is public.

## Alpha foundation

- Framework extraction and a tarball-tested starter are implemented in `packages/core` and `examples/starter`.
- Define and document the public API and supported environment matrix.
- The `create-fastang` scaffolding command and its packaged template are implemented and tested outside the workspace. Version `0.1.0-alpha.2` is available on npm under the `alpha` tag.
- Browser automation covers hydration, client routing, data, redirects and failures on Chromium, Firefox and WebKit, including mobile emulation.
- Validate the Vercel adapter on a real Preview deployment.
- Versioning, changelogs and verified npm tarball tooling are implemented.

## Framework capabilities

- API helpers expose native Fastify route options with typed hooks, per-route limits and config, while retaining file-derived methods/URLs and contract-derived schemas (from `0.1.0-alpha.2`).

- Read-only `fastang routes` inspection lists the discovered page/layout/metadata tree and explicit API methods, with versioned JSON output (from `0.1.0-alpha.2`).

- Configuration validation rejects invalid options and unsafe or conflicting prerender paths before starting the development server or replacing build output. The development supervisor recovers after a corrected config is saved (from `0.1.0-alpha.2`). More explicit rendering policies remain future work.
- Optional shared TypeBox contracts infer Fastify handler types and Angular client requests from `0.1.0-alpha.2`; packaged SSR/browser/Vercel checks cover the greeting example.
- An optional Fastify session/authentication example covers login, protected SSR, logout, Origin checks and browser isolation; production identity-provider integration remains application-specific.
- An explicit SSR HTTP contract for credentials, response cookies, redirects and hydration cache is implemented on main; see [the contract](docs/ssr-http.md).
- ISR and on-demand revalidation for adapters that support them.

## Measurement

- A reproducible production-starter benchmark records build sizes, fresh-process startup and sequential HTTP latency, with raw JSON samples and environment metadata. See [the measurement guide](docs/benchmarks.md).
- Comparisons with plain Angular SSR and Analog using equivalent workloads.
- Documented tradeoffs between shared and per-route deployment functions.
