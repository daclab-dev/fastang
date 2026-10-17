# Reproducible starter measurements

From a repository checkout with dependencies installed using `npm ci`:

```sh
npm run benchmark
```

The command rebuilds the local core, copies the minimal starter into a temporary
folder, links the checkout's installed dependencies and builds the production app.
It does not use the documentation site, a running development server or the npm
registry version of the core. Temporary files and all benchmark servers are
removed on success or failure. Reports remain in the ignored
`.fastang/benchmarks/<timestamp>.json` directory.

Use `npm run benchmark -- --smoke` for a short correctness check. CI uploads its
JSON report as an artifact; smoke results are not a performance baseline. No
machine-dependent performance thresholds gate CI.

## What is measured

- **Build time:** one `npm run build` of the copied starter, including generation,
  type checks, client/server compilation and prerender. Core compilation, dependency
  installation and compression measurements are outside this interval. This is
  a single observation, not a distribution of clean-machine build times.
- **Output size:** file count and raw bytes for `dist/client` and `dist/server`.
  The client also includes sums of individually compressed files using gzip level
  9 and Brotli quality 11. These totals include all client assets and prerendered
  HTML, not just the resources needed by one page. They are compression estimates,
  not observed network transfer sizes. Server bytes exclude external dependencies
  in `node_modules`; they are not Vercel function deployment sizes.
- **Startup:** five fresh Node processes. `listenMs` includes process creation,
  module import, server creation, binding a random loopback port and IPC readiness.
  `firstSsrMs` measures the first HTTP request to `/`, including reading its body.
  `spawnThroughFirstSsrMs` measures both phases together. OS filesystem caches are
  not flushed, and the Node HTTP client runs in the parent process. These are
  local fresh-process samples, not platform cold-start measurements.
- **Warm HTTP requests:** twenty warmup requests followed by two hundred measured
  requests for each path, at concurrency one. `/` renders Angular; `/greet/Ada`
  renders Angular and resolves data through Fastify; `/about` serves prerendered
  HTML; `/api/health` returns a small JSON response. Each request must return the
  expected status, content and rendering header before it counts as successful.

Request times include the parent process's `fetch`, loopback transport, server
processing and complete body consumption. Connections may be reused by Node's
fetch implementation. Assertions run outside the timing interval. Percentiles
use the nearest-rank method; raw request and startup samples are preserved.
Paths run in a fixed order in the same warmed server process. These tests measure
neither maximum throughput nor concurrent-user load, browser hydration, remote
network latency, TLS, CDN cache behavior, database access or Vercel execution.

## Comparing runs

The JSON records settings, Node/OS/CPU/memory information, the source commit,
whether the checkout was dirty, the dependency lockfile hash and package metadata.
Keep reports from a clean checkout when recording a baseline. Use the same
lockfile, Node version, hardware, power settings and background workload; repeat
full runs and inspect their variation. Absolute timings from a shared CI runner
should not be compared as if they came from controlled hardware.

A comparison with plain Angular SSR, Analog or another framework must reproduce
the same page markup, data operation, rendering mode, build configuration and
measurement procedure. This command provides a FastAng baseline only; no
cross-framework performance claim follows from it.
