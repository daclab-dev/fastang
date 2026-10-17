# Get started with FastAng

Create a project, start the server and try an Angular page that reads a Fastify API.

## Requirements

This guide targets FastAng `0.1.0-alpha.1`. Use Node `^22.22.3`, `^24.15.0` or `>=26.0.0`, with npm. The starter uses Angular `22.2.3`, Vite `8.3.4` and Fastify `^5.12.7`. APIs may change between alpha releases.

## Create and run

```bash
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Open `http://localhost:3278`. Port 3278 spells FAST on a telephone keypad. The generator creates a new directory and rejects existing destinations. `--install` runs npm install. Without it, run npm install in the project before starting the server.

## Try the project

| URL | What to check |
| --- | --- |
| `/` | The counter responds after Angular hydration. |
| `/greet/world` | The resolver reads a greeting from Fastify. |
| `/api/health` | JSON response with `ok: true`. |
| `/about` | A prerendered page in the production build. |
| `/missing` | A not-found page with HTTP 404 on the server. |

In development, `/about` also renders on the server for each request. Prerendering applies to production builds.

## Where to work

- `src/app/pages`: pages, layouts and router metadata.
- `src/server/api`: Fastify endpoints with the method in the filename.
- `src/server/plugins.ts`: server plugins and hooks.
- `fastang.config.ts`: prerender URLs and Vercel options.

## Check production

```bash
npm run check
npm run build
npm start
```

Stop the development server before starting production on the same port. `npm run check` validates types and templates without starting a server.

Continue with [pages and layouts](routing.md), then [APIs](api.md).
