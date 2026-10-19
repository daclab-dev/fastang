# create-fastang

Generate a minimal Angular + Fastify application with FastAng.

This is an experimental alpha package. Use the explicit `alpha` tag for the prerelease:

```sh
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Registry installation is available once the generator and matching core release have been published. For local release testing, use the tarball workflow below.

## Use from this repository

At the repository root:

```sh
npm ci
npm pack --workspace @fastang/core --pack-destination /tmp
npm run create -- /tmp/my-fastang-app --core-package /tmp/fastang-core-0.1.0-alpha.6.tgz
cd /tmp/my-fastang-app
npm install
npm run dev
```

Open http://localhost:3278. Use PORT and HOST to override the defaults.
The core tarball must remain available for future clean dependency installations.

## Test the packaged generator

```sh
npm pack --workspace create-fastang --pack-destination /tmp
npm exec --package=/tmp/create-fastang-0.1.0-alpha.6.tgz -- create-fastang /tmp/another-app --core-package /tmp/fastang-core-0.1.0-alpha.6.tgz
```

No checkout files are required by either installed package. The generated app
includes its own configuration, Node and Vercel entries, pages and API endpoints.

## Options

- `<directory>`: new project directory. Existing files, folders and symlinks are rejected, including an existing empty directory. Without an argument, an interactive terminal asks for the directory; automation must provide one explicitly.
- `--name <name>`: npm package name, including scoped names. Otherwise a lowercase name is derived from the directory.
- `--core-package <file.tgz>`: local core package for use before registry publication.
- `--install`: run npm install after generating the project. On failure, the generated files remain available for retrying installation.
- `--no-install`: generate files only; this is the default.
- `--help`, `--version`: show usage or generator version.

There are no git operations, global installations or deployments. Use the
project's `npm run build:vercel` command when preparing a Vercel deployment.

## Maintain the template

`examples/starter` is the single source of application files. `npm run build
--workspace create-fastang` compiles the generator and prepares its distributable
template. `prepack` runs this build automatically. Build output, dependencies,
local environment files and generated routes are excluded. `.gitignore` is
shipped as `_gitignore` and restored when creating an app.

`npm run test:starter` installs both tarballs outside the workspace, invokes the
installed generator and verifies the generated application, including development
restarts and an actual packaged Vercel function.

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
