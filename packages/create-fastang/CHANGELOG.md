# Changelog

## Unreleased

- Add a branded, responsive starter welcome page with a floating FastAng shield, an animated orbit and reduced-motion support.

## 0.1.0-alpha.5

- Detect npm/pnpm, accept --package-manager and generate matching scripts, metadata and explicit Angular toolchain build policies.

## 0.1.0-alpha.4

- Pin the new core release and include static route checks in the generated app check script.

## 0.1.0-alpha.3

- Pin generated applications to core alpha.3; support creation through the standalone CLI.

## 0.1.0-alpha.2

- Pin the starter to @fastang/core 0.1.0-alpha.2 with typed contracts, native route options, route inspection and development configuration validation.

## 0.1.0-alpha.1

- Pin the generated starter to @fastang/core 0.1.0-alpha.1, with runtime configuration validation and the explicit SSR HTTP contract.

## 0.1.0-alpha.0

Initial experimental release.

- Generate an independent Angular + Fastify application.
- Include a home page, prerendered page, SSR API example and HTTP 404 page.
- Use the same starter source maintained in the repository.
- Customize the npm package name and optionally install dependencies.
- Support local core tarballs before registry publication.
- Reject existing destinations and exclude local/generated files from templates.

The generator pins the matching @fastang/core alpha release.
