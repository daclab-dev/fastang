# Repository operations

FastAng keeps the framework, starter and official website in one repository so
changes to behavior, executable examples and documentation can be reviewed
together. `src/` is the website; `packages/` contains the published tooling.
Site deployments and npm publication are separate operations.

## Everyday work

1. Create a feature branch from current `main`.
2. Make a focused change and run the checks relevant to it.
3. Push the branch and open a pull request targeting `main`.
4. Inspect the diff, including lockfiles, scripts and workflows. Wait for every
   required CI check, then squash-merge using the exact reviewed head commit.
5. Update your checkout from `main`; Vercel deploys that production branch.

Direct pushes, force pushes and deletion of `main` are blocked, including for
the administrator. The initial single-maintainer policy requires a PR and
successful checks but zero additional approvals; GitHub cannot count your own
approval as an independent review. CODEOWNERS requests the maintainer's review;
it does not by itself restrict merging. Add independent required reviews when
another trusted maintainer joins.

## Contributions and Actions

Only the owner currently has repository write access. Keep contributors on
forks unless they need write access for a specific role. External fork Actions
require maintainer approval for all external contributors. Review each changed
revision before approval; never treat an earlier contribution as blanket trust.
Never check out untrusted PR code from a privileged `pull_request_target` or
`workflow_run` job with secrets or write permissions.

CI uses GitHub-hosted runners, a read-only token, non-persistent checkout
credentials, bounded job timeouts and actions pinned to full commit hashes.
Only GitHub-owned actions are permitted. Dependabot proposes action updates;
review them like code changes. Push CI runs on `main`; feature branches use PR
CI to avoid duplicate full test runs. Do not disable required jobs by path filters
without providing an always-reported gate, or merges can remain blocked.

## Releases and deployment

Release tags matching `v*` cannot be moved, rewritten or deleted. Creating a new
release tag remains possible for a maintainer. Follow [the release procedure](releases.md)
from a clean, merged commit that passed CI. npm publishing is manual with account
2FA; GitHub CI does not publish packages. A website deployment does not publish npm.

The Vercel project must retain Git Fork Protection and authentication for preview
URLs. Approving a fork preview executes contributor code; do not expose production
secrets to previews. A Vercel Git integration runs outside GitHub Actions, so its
protection is a separate setting. Production follows `main`.

## Account and incident handling

Require 2FA for the organization; keep recovery codes offline and use a passkey
or security key for the owner account. Do not share personal tokens. Periodically
review organization owners, outside collaborators, GitHub Apps, deploy keys and
npm/Vercel access. Keep billing alerts and spending limits configured in the
hosting account; repository protections do not limit website traffic or costs.

Secret scanning and push protection detect supported credential patterns, not
all secrets. If a credential leaks, revoke or rotate it first, inspect audit and
provider logs, then remove it from code. A deleted commit does not invalidate a
credential. Never paste the value into a public issue.

If malicious code is merged, stop pending deployment/publication, revert it via
a PR and review affected tokens, artifacts and releases. Do not rewrite a release
tag: issue a corrected version and publish an advisory where appropriate.

Rulesets are managed in GitHub Settings, not by this document. An owner can edit
them for recovery, but normal work must use the protected path. Before changing
required check names, update the ruleset in the same maintenance window. Local
configuration snapshots, when taken, live under ignored `.fastang/security/`.
