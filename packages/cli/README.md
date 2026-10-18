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
