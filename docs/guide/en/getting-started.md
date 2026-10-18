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

## Standalone CLI

To use `fastang new` directly, install the lightweight CLI globally:

```sh
npm install -g @fastang/cli@alpha
fastang new another-app --install
```

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

## Check production

```bash
npm run check
npm run build
npm start
```

Stop the development server before starting production on the same port. `npm run check` validates types and templates without starting a server.

Continue with [pages and layouts](routing.md), then [APIs](api.md).

## pnpm support

From `0.1.0-alpha.5`, npm and pnpm 10/11 are supported for standalone applications:

```sh
pnpm create fastang@alpha my-app --package-manager pnpm --install
cd my-app
pnpm run dev
```

The generator detects the invoking manager through its user agent; an explicit
`--package-manager npm|pnpm` overrides detection. Without either it defaults to
npm. Generated pnpm projects use pnpm scripts and record the detected pnpm
version in `packageManager`. `--no-install` preserves generation-only behavior.
The generated `pnpm-workspace.yaml` lists build-script permissions for the Angular
toolchain explicitly: pnpm 10 uses `onlyBuiltDependencies`, pnpm 11 uses
`allowBuilds`. Review that policy when adding/updating dependencies. If the pnpm
version is unavailable during generation, approve required scripts with
`pnpm approve-builds` before building. No global pnpm settings are changed.

Use `pnpm run check`, `pnpm run build`, `pnpm start` and `pnpm run build:vercel`.
Vercel output preserves relative dependency links and is tested outside the
source project. The CI matrix tests pnpm 10 and 11 on Linux with Node 24.

For updates, the standalone CLI uses the app's `packageManager` and lockfile,
regardless of whether the CLI itself was launched by npm or pnpm:

```sh
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha --yes
```

The first command only plans. pnpm updates require a standalone version-9
lockfile, a registry core version and an installation matching the manifest and
lockfile. Engine/peer compatibility and downgrade protections remain enabled.
Mixed lockfiles, conflicting manager declarations and shared workspace lockfiles
are rejected. There is no automatic conversion between package managers. Monorepo
dependency updates remain manual.
