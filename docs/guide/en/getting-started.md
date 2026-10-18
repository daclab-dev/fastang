# Get started with FastAng

Create a project, start the server and try an Angular page that reads a Fastify API.

## Requirements

This guide targets FastAng `0.1.0-alpha.5`. Use Node `^22.22.3`, `^24.15.0` or `>=26.0.0`, with npm or pnpm 10/11. The starter uses Angular `22.2.3`, Vite `8.3.4` and Fastify `^5.12.7`. APIs may change between alpha releases.

## Create and run

```bash
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Open `http://localhost:3278`. Port 3278 spells FAST on a telephone keypad. The generator creates a new directory and rejects existing destinations. `--install` runs npm install. Without it, run npm install in the project before starting the server.

## pnpm support

With pnpm 10 or 11, you can create the project and install its dependencies in one command:

```sh
pnpm create fastang@alpha my-app --install
cd my-app
pnpm run dev
```

Open `http://localhost:3278`. FastAng recognizes pnpm and uses it to install
dependencies and set up the project's scripts. Installation creates
`pnpm-lock.yaml`: commit it alongside `package.json` to keep dependency versions
consistent across computers.

To install dependencies later, replace `--install` with `--no-install`, then run
`pnpm install` in the project directory.

When running the generator through another package manager, add
`--package-manager pnpm` to select pnpm explicitly.

### Project commands

Run these commands from the application directory:

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the development server with page updates. |
| `pnpm run check` | Check routes, TypeScript types and Angular templates. |
| `pnpm run build` | Check the project and create a production build. |
| `pnpm start` | Start the server from the production build. |
| `pnpm run build:vercel` | Prepare the build for deployment on Vercel. |

To update an existing application, follow [the pnpm upgrade steps](upgrading.md#pnpm-updates).

### Blocked installation scripts

If pnpm reports blocked scripts, for example with `Ignored build scripts`, run:

```sh
pnpm approve-builds
pnpm install
```

In the first command, select the dependencies whose scripts you want to allow.
Then repeat the installation. Project permissions are stored in
`pnpm-workspace.yaml`.

## Standalone CLI

To use `fastang new` directly, install the lightweight CLI globally:

```sh
npm install -g @fastang/cli@alpha
fastang new another-app --install
```

To create a pnpm project with the global CLI, use
`fastang new another-app --package-manager pnpm --install`.

Without a global installation, run
`npx --package=@fastang/cli@alpha fastang-cli new another-app --install`.
The CLI uses the matching generator release. Development and build use the core
installed in the app. See [upgrading](./upgrading.md) for existing projects.

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

## Use FastAng with an AI assistant

Give your assistant the [llms.txt](https://fastang.dev/llms.txt) URL. It contains
a FastAng overview and links to Markdown guides without the website navigation.
You can start with this request:

Read https://fastang.dev/llms.txt and the relevant guides. Before proposing
changes, check the @fastang/core version in the project's package.json.
Use the documented FastAng, Angular and Fastify APIs and keep server code
separate from browser code.

If your tool accepts attached documents but cannot follow links, download
[llms-full.txt](https://fastang.dev/llms-full.txt) and add it to the context:
it contains all current guides in English. You can also supply just the
individual Markdown guides listed in the index to keep the context focused
on the task.

Not every assistant reads these files automatically: explicitly provide the
URL or attach the document. Before v1, the guides track the current alpha;
for projects on older versions, also read the
[release notes](https://github.com/daclab-dev/fastang/releases).
Always verify generated changes with `npm run check` and `npm run build`,
or the equivalent pnpm commands, and your application's tests.

## Check production

```bash
npm run check
npm run build
npm start
```

Stop the development server before starting production on the same port. `npm run check` validates routes, types and templates without starting a server.

Continue with [pages and layouts](routing.md), then [APIs](api.md).
