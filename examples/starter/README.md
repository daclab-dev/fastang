# FastAng starter

A minimal Angular + Fastify app. No website content or branding assets are required.

## From this repository

```sh
npm ci                     # at the repository root
npm run dev:starter
```

Open http://localhost:3278. `PORT` and `HOST` override the defaults.

This checkout resolves `@fastang/core` through the npm workspace. For an independent copy, pack the core at the repository root, copy this directory elsewhere, and replace that dependency with the absolute path to the tarball:

```sh
npm pack --workspace @fastang/core --pack-destination /tmp
# In the copied starter:
npm install /tmp/fastang-core-0.1.0-alpha.0.tgz
npm run build
npm start
```

The package has not been published to npm. Do not replace the tarball with a registry version yet.

## Files and commands

- `src/app/pages/*.page.ts`: Angular pages; `[name]` creates a parameter and `[...slug]` a catch-all.
- Adjacent `.route.ts`: Angular route metadata, resolvers, guards and providers.
- `src/server/api/**/*.get.ts`: validated Fastify endpoints, registered by the route generator.
- `src/server/plugins.ts`: Fastify plugin and hook registration.
- `src/main.server.ts`: shared Angular renderer, supplied with this app's root component and configuration factory.
- `fastang.config.ts`: explicit prerender URLs and Vercel function settings.

`npm run check` validates templates and types. `npm run build` generates the Node server, client assets and prerendered `/about`. `npm start` runs the production server. `npm run build:vercel` creates `.vercel/output` for the Vercel Build Output API (framework preset Other, build command `npm run build:vercel`, no output-directory override).

The home page includes an interactive counter. `/greet/world` resolves data through `/api/greet/world` during SSR and uses Angular's HTTP transfer cache during hydration. `/about` is prerendered; unknown pages return HTTP 404.
