# Roadmap

This is a direction for the prototype, not a release schedule or compatibility
promise. Track concrete work in repository issues once the project is public.

## Alpha foundation

- Framework extraction and a tarball-tested starter are implemented in `packages/core` and `examples/starter`.
- Define and document the public API and supported environment matrix.
- The `create-fastang` scaffolding command and its packaged template are implemented and tested outside the workspace. Version `0.1.0-alpha.0` is available on npm under the `alpha` tag.
- Browser automation covers hydration, client routing, data, redirects and failures on Chromium, Firefox and WebKit, including mobile emulation.
- Validate the Vercel adapter on a real Preview deployment.
- Versioning, changelogs and verified npm tarball tooling are implemented.

## Framework capabilities

- Configuration validation rejects invalid options and unsafe or conflicting prerender paths before replacing build output. More explicit rendering policies remain future work.
- Typed API clients derived from route contracts.
- Cookie/session and authentication integration with isolation tests.
- A defined contract for API cookies and redirects during SSR.
- ISR and on-demand revalidation for adapters that support them.

## Measurement

- Reproducible build-size, startup and request benchmarks.
- Comparisons with plain Angular SSR and Analog using equivalent workloads.
- Documented tradeoffs between shared and per-route deployment functions.
