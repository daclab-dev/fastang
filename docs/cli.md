# Unified CLI

Project creation and updates are owned by the lightweight `@fastang/cli`
package, introduced in `0.1.0-alpha.3`. `@fastang/core` retains the project runtime
commands. Install it globally:

```sh
npm install -g @fastang/cli@alpha
fastang new my-app --install
```

For an older project, the standalone CLI can run updates even if its local core
has no update command:

```sh
npx --package=@fastang/cli@alpha fastang-cli update --to alpha
```

The `fastang-cli` alias avoids conflicting with a local older `fastang` binary.
Development and build commands always use the app’s installed core.

```sh
fastang new my-app --install
fastang update --to latest
fastang update --to alpha
fastang update --to 0.1.0-alpha.2 --yes
fastang --version
```

Inside an installed app, `npx fastang dev` and npm scripts select the local
core executable. For `new` and `update`, use the standalone `fastang-cli` alias
when a local `fastang` executable would take precedence. For a new app outside any project, use
`npx --package=@fastang/cli@<released-version> fastang-cli new my-app` with a published version. `npm create fastang@alpha` remains supported.

`new` runs the matching version of `create-fastang`, including its existing
options and protection against overwriting an existing directory. npm may need
network access to fetch that generator.

`update --to <version|tag>` reads the target release from the configured npm
registry and prints its resolved version, engines and peer requirements. It is a
plan by default; `--dry-run` makes that intent explicit. `--yes` installs the
resolved exact core version using npm with strict engines and peer dependency
checks. It preserves the dependency section (production/development).

`latest` resolves the npm dist-tag named `latest`; it does not calculate the
highest version or include every prerelease. Use `alpha` for the alpha channel.
The plan displays the resolved version before installation.

Commit your application and lockfile before applying. Align incompatible peers
using the release instructions. npm installation can execute dependency lifecycle
scripts and change package.json, the lockfile and node_modules; failures are not
transactionally rolled back. Review changes and restore your commit if needed.

The command supports individual npm apps; workspace roots and projects declaring
another package manager are rejected. Run it in the app directory. It does not
rewrite application sources, run codemods or automatically upgrade Angular and
other peers. Run your build and tests and apply any documented source migrations
before deploying. Tags such as `alpha` may resolve to breaking experimental releases;
use explicit versions for reproducible upgrades.

The plan compares the actual installed core, Node and peers against the target.
Missing optional peers are accepted; incompatible installed optional peers are
reported. Applying an incompatible plan is blocked. The CLI does not automatically
align Angular or other peers. When core is already at the target version, no
installation is run. Downgrades are reported and require `--allow-downgrade` when
applying. Commit first: npm failures do not provide transactional rollback.

The updater requires a v2/v3 npm package-lock.json and checks that its root
declaration and core version agree with the manifest and installation. Missing
or inconsistent state is reported even if the target is already installed.
The alpha releases currently keep CLI, generator and core versions coordinated.
