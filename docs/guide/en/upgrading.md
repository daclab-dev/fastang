# Update an existing project

Update the framework dependency in your existing app. The generator creates new
projects; running it again is not an update procedure and it refuses existing
destinations. Your pages, APIs, styles and business code remain application files.

## Choose the target release

Commit the current app and its lockfile, read the target release notes and record
the installed version. This example upgrades `0.1.0-alpha.1` to `0.1.0-alpha.2`.

```sh
npm ls @fastang/core
npm view @fastang/core@0.1.0-alpha.2 peerDependencies engines --json
```

Check Node and the target peer dependencies before installing. If Angular, Vite,
TypeScript or other peer ranges change, align the application's dependencies too.
Keep all pinned Angular packages aligned. If Node requirements change, update
the runtime, project engines and CI/deployment settings together. Do not use `--force` or
`--legacy-peer-deps` to turn a dependency mismatch into an apparently successful
upgrade. Alpha releases may change APIs even within the same `0.1.0` prerelease
line. Read [the release notes](https://github.com/daclab-dev/fastang/releases).

## Install and verify

```sh
npm install --save-exact @fastang/core@0.1.0-alpha.2
npm run generate
npm run build
npm run build:vercel
```

Run the application's own tests and checks for any deployment you use; the Vercel
command is only needed for a Vercel app. Review and commit `package.json`,
`package-lock.json` and intentional migration changes together. Deploy the checked
commit. The generator is not normally installed in the generated app and does
not need to be updated there.

For a future stable `1.0.0` to `1.2.0` upgrade, use the same process with `1.2.0`
as the explicit target. This is an example, not a currently published release.
Stable minor releases are intended to preserve compatibility; major changes
require migration instructions. During alpha, use the release notes rather than
assuming that every minor-looking change is compatible.

## Application bindings and migrations

Installing the package updates the framework, not the copies of starter files in
your project. In particular, `src/server/index.ts`, `start.ts`, `api-entry.ts`,
`vercel-entry.ts`, Angular bootstrap/configuration and Vite/FastAng config belong
to the app. If a release changes those bindings, apply its documented migration
and keep your custom behavior.

Starting with `0.1.0-alpha.3`, the separate `@fastang/cli` package owns
project creation and upgrades. It also works with older installed cores:

```sh
npx --package=@fastang/cli@0.1.0-alpha.4 fastang-cli update --to alpha
npx --package=@fastang/cli@0.1.0-alpha.4 fastang-cli update --to alpha --yes
```

The first command shows a plan; the second applies the npm installation.
`--to latest` follows npm's `latest` tag, which may differ from `alpha`.
The plan compares Node, installed peers and the target release. The manifest,
lockfile and installed core must agree: reconcile differences using `npm install`
or `npm ci` as instructed and review the diff. Incompatibilities block applying;
downgrades require `--allow-downgrade`. An identical installed version with
consistent state does not trigger installation. Source migrations remain manual.
npm installation can execute scripts and failures are not automatically rolled back. Do not replace the entire `src/` directory with a new template. To compare
a target starter, generate a separate app outside the existing project:

```sh
cd ..
npm create fastang@0.1.0-alpha.2 fastang-comparison -- --install
```

Compare only the relevant bindings and configuration, then apply the necessary
changes manually. `fastang generate` rewrites generated registration modules;
it is not a general migration tool. Moving to `alpha.2` adds optional features:
existing endpoints do not need to become contracts and TypeBox is not required
unless you adopt shared schemas.

## Documentation versions and rollback

Use the version selector above the guides. Versioned URLs retain the selected
version; sidebar links, pagination, relative guide links and language switching
stay in it. If a guide is absent in the selected release, changing version opens
that release's index. An unknown version or guide returns HTTP 404 instead of
silently showing the newest instructions.

Before v1, the selector exposes only the current documentation, updated in place.
Older alpha guides are not retained on the site; their sources remain in Git tags.
Versioned URLs for retired alpha guides return 404. Documentation snapshots
will start with stable v1 releases. `/docs` opens the current guides.

To roll back, restore the previous application commit and lockfile, run `npm ci`
and redeploy that checked state. Simply downgrading the package does not undo
manual source changes or external database/service migrations.
