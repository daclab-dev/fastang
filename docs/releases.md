# Publishing FastAng alpha releases

Core and generator are versioned together. The initial release is
`0.1.0-alpha.0`, published publicly to npm with the `alpha` distribution tag.
The `latest` tag is reserved for a later release decision.

## Prerequisites

- The npm account owns the `fastang` organization and can publish `create-fastang`.
- Run `npm login` locally; enable the authentication npm requires for publishing.
- Keep credentials and one-time codes out of this repository and issue reports.
- Commit the release sources and push them to GitHub. Wait for CI to succeed.

## Verify and prepare

```sh
npm ci
npm run release:check
```

This checks types, routing/runtime tests, production rendering, Vercel output,
the installed generator and its generated app, and the dependency audit. It then
packs both workspaces and validates package contents, versions, publication
settings, template dependency and SHA-512 integrity.

The files are written to `.fastang/releases/0.1.0-alpha.0/`. `release.json`
records the source commit, whether the worktree was clean, and each tarball's
integrity. Build output is ignored by Git.

After committing and pushing any final source changes, run `npm run release:pack`
to regenerate the release metadata against that commit. Verify that
`cleanWorkingTree` is true and that CI passed for the recorded commit.

## Publish the exact verified tarballs

Publish core first, then the generator that depends on it:

```sh
npm publish .fastang/releases/0.1.0-alpha.0/fastang-core-0.1.0-alpha.0.tgz --access public --tag alpha
npm view @fastang/core@0.1.0-alpha.0 version dist.integrity --json
npm publish .fastang/releases/0.1.0-alpha.0/create-fastang-0.1.0-alpha.0.tgz --access public --tag alpha
npm view create-fastang@0.1.0-alpha.0 version dist.integrity --json
```

Compare registry integrity with `release.json`. Check the distribution tags with
`npm dist-tag ls <package>`. On the initial publication npm may automatically
assign `latest` as well; remove it with `npm dist-tag rm <package> latest` to
keep this release on the `alpha` channel. This metadata change may require its
own interactive 2FA approval.

npm may ask for an interactive
second-factor approval; complete that locally. Do not bypass it with credentials
stored in a workflow or committed file.

If publishing the second package fails, preserve the first published version
and retry only the missing package. Do not unpublish/rebuild the already released
version. npm versions are immutable: source changes require a new alpha version.

## Verify the registry installation

Run in a new directory outside the repository:

```sh
npm create fastang@alpha my-fastang-app -- --install
cd my-fastang-app
npm run build
npm start
```

Check the home page, `/greet/world`, `/api/health`, `/about` and an unknown URL.
`npm run build:vercel` should also produce the deployable output.

After registry verification, create Git tag `v0.1.0-alpha.0` pointing at the
release commit and publish the release notes. The installation command for an
alpha must include `@alpha`; do not imply that it is a stable release.

For later releases, configure npm trusted publishing for a dedicated GitHub
Actions release workflow. Keep it separate from the read-only test workflow;
OIDC provenance should identify the commit and workflow that produced a release.

Official references: [public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/),
[distribution tags](https://docs.npmjs.com/adding-dist-tags-to-packages/),
[trusted publishing](https://docs.npmjs.com/trusted-publishers/).
