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
npm run create -- /tmp/my-fastang-app --core-package /tmp/fastang-core-0.1.0-alpha.1.tgz
cd /tmp/my-fastang-app
npm install
npm run dev
```

Open http://localhost:3278. Use PORT and HOST to override the defaults.
The core tarball must remain available for future clean dependency installations.

## Test the packaged generator

```sh
npm pack --workspace create-fastang --pack-destination /tmp
npm exec --package=/tmp/create-fastang-0.1.0-alpha.1.tgz -- create-fastang /tmp/another-app --core-package /tmp/fastang-core-0.1.0-alpha.1.tgz
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
