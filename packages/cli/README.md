# @fastang/cli

Lightweight FastAng CLI. Available starting with `0.1.0-alpha.3`:

```sh
npm install -g @fastang/cli@alpha
fastang new my-app --install
cd my-app
fastang dev
fastang update --to alpha
fastang update --to alpha --yes
```

Without a global install, use `npx --package=@fastang/cli@alpha fastang new my-app`.
`new` uses the generator matching the CLI release. `dev`, `build`, `generate` and
`routes` execute the app's installed core, preserving its version and arguments.
No Angular, Vite or Fastify dependencies are installed with this CLI.
Its only runtime dependency is semver for version comparisons.

`update` also works with older cores: it runs in the standalone CLI and updates
the app's core dependency. It defaults to a plan. `--yes` installs the resolved
exact version with strict peer and Node engine checks. Source migrations remain
manual; commit your app first, review the release instructions and run your tests.
Use `--to latest` for the npm latest tag or `--to alpha` for the alpha channel.

Inside npm scripts and with `npx fastang`, the app's local binary takes precedence.
For an older project, explicitly select the standalone CLI without a bin conflict:

```sh
npx --package=@fastang/cli@alpha fastang-cli update --to alpha
```

The alias `fastang-cli` provides the same commands as `fastang`. Avoid installing
this package alongside core as an app dependency; a global install or npm exec
keeps the two executables separate.

The plan compares installed versions and Node with target requirements. Applying
is blocked on incompatibility. An identical installed version is a no-op;
downgrades require `--allow-downgrade` explicitly. Source migrations remain manual.

## Route checks (from 0.1.0-alpha.4)

`fastang check [--project <tsconfig>] [--json] [--strict]` forwards to the app’s
local core. Both CLI and core must contain this new command; use `0.1.0-alpha.4` or later for both packages. It does not run the application. See the core
README for diagnostics and static-analysis limits.

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
