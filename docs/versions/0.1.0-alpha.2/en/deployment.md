# Deploy to Node and Vercel

Use the same project for a persistent Node server or Vercel functions.

## Node server

```bash
npm ci
npm run build
HOST=0.0.0.0 PORT=3278 npm start
```

Use `npm ci` when the project already has a `package-lock.json`; the generator creates it with `--install`. Otherwise run `npm install` first and commit the lockfile.

The process uses the alpha's supported Node runtime. Keep the complete `dist/server`, `dist/client` and `dist/prerender.json` structure with installed runtime dependencies; do not copy only `index.js`. The server serves assets and prerendered URLs from the client directory.

`HOST=0.0.0.0` makes the process reachable on the machine's interfaces, useful behind a reverse proxy or in a container. Configure TLS, the domain and process restarts through your hosting platform. On `SIGTERM`, the server closes Fastify.

## Vercel

The starter includes `vercel.json`. Import the repository into Vercel with these settings.

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Build command | `npm run build:vercel` |
| Output directory | No override |
| Project Node version | 24.x |

To check the output before deploying:

```bash
npm run build:vercel
```

The command generates `.vercel/output` in the Build Output API format. Do not upload these files to a public website root or set `dist/client` as the output: the root template must remain private to the SSR renderer.

## Rendering and functions

The starter uses `vercel: { functions: 'routes' }`: the adapter creates dedicated page and endpoint functions plus fallbacks. Static files and prerendered pages use the CDN. Functions reuse Fastify initialization between warm invocations without starting a TCP listener.

Configure server variables in Vercel and redeploy to apply changes. Do not use client `VITE_` variables for secrets. This alpha does not implement ISR or shared SSR HTML caching.

## Verify the result

Check `/`, `/greet/world`, `/api/health`, `/about` and an unknown URL. Also try the counter and browser navigation. A successful build does not replace checking the actual deployment.

Return to [configuration and environment](configuration.md) for server plugins and variables.
