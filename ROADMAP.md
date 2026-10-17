# Roadmap

This is a direction for the prototype, not a release schedule or compatibility
promise. Track concrete work in repository issues once the project is public.

## Before the first installable release

- Framework extraction and a tarball-tested starter are implemented in `packages/core` and `examples/starter`.
- Define and document the public API and supported environment matrix.
- The `create-fastang` scaffolding command and its packaged template are implemented and tested outside the workspace. Registry publication remains pending.
- Add browser automation for hydration and client routing regressions.
- Validate the Vercel adapter on a real Preview deployment.
- Prepare versioning, changelogs and npm release tooling.

## Framework capabilities

- More explicit rendering policies and safer configuration validation.
- Typed API clients derived from route contracts.
- Cookie/session and authentication integration with isolation tests.
- A defined contract for API cookies and redirects during SSR.
- ISR and on-demand revalidation for adapters that support them.

## Measurement

- Reproducible build-size, startup and request benchmarks.
- Comparisons with plain Angular SSR and Analog using equivalent workloads.
- Documented tradeoffs between shared and per-route deployment functions.
