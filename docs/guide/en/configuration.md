# Configuration, plugins and environment

Extend the server with Fastify and keep public settings separate from backend secrets.


Configuration validation is available from `0.1.0-alpha.1`.

`defineConfig()` validates configuration at runtime. The build also validates plain default exports before replacing `dist/`. Unknown options, invalid types, reserved prerender paths (`/`, `/api`, `/assets`, `/__fastang`) and conflicting destinations such as `/about` plus `/about/` fail with an explicit error. Prerender paths contain only ASCII letters, digits, underscores, hyphens and slashes; query strings and fragments are not supported.


On the main branch (next alpha), `fastang dev` also validates plain configuration
exports before loading application plugins or opening the server. Invalid settings
stop the current server; the development supervisor keeps watching. Correct and
save `fastang.config.ts` to restart automatically. Development still renders
prerender paths on demand; static HTML is generated only during the build.

## Register a hook

Replace `src/server/plugins.ts` with this file. The hook adds a header to every request handled by Fastify.

```ts file=src/server/plugins.ts
import type { FastifyInstance } from 'fastify';

export async function configureServer(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('x-app-name', process.env['APP_NAME'] ?? 'my-fastang-app');
  });
}
```

This entry is used by the Node server and Vercel API/SSR functions. Files served directly by Vercel's CDN do not pass through Fastify hooks. You can also use `app.register()` for Fastify 5 compatible plugins. Install additional plugins in your project: they are not included automatically.

## Server variables

```bash
PORT=4000 HOST=127.0.0.1 APP_NAME=my-app npm run dev
```

The example uses POSIX shell syntax. Supply variables through the shell or deployment platform. The alpha does not automatically load `.env` files into the Fastify process. `PORT` must be valid; the default port is 3278 and the default host is `127.0.0.1`.

Vite's `VITE_` variables are intended for the client and can enter the browser bundle. Do not use them for server secrets. Read server variables from `process.env` in APIs and plugins.

## The two configuration files

`fastang.config.ts` contains explicit prerender URLs and Vercel adapter options. `vite.config.ts` uses `defineFastangConfig()` from `@fastang/core/vite`: this includes Angular compilation, route generation and the server/client boundary.

Do not import `src/server` code, `.server.ts` files or server runtime APIs into browser components. The bundle check rejects these imports even through another module. Shared types should live in modules that do not load server dependencies.

See [Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/) and [Vite variables](https://vite.dev/guide/env-and-mode). Continue with [deployment](deployment.md).
