# Security policy

FastAng is experimental alpha software. Security fixes target the current alpha;
older alpha versions do not receive separate maintenance releases. Update to the
current release and read its migration notes before deploying a fix.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/daclab-dev/fastang/security/advisories/new).
Do not disclose an unpatched vulnerability in a public issue or pull request.

Include the affected package/version, deployment environment, a minimal
reproduction, expected versus actual behavior and the potential impact.
Use synthetic data. Never include working credentials, customer data or tokens.
Please allow the maintainer to investigate and coordinate disclosure before
publishing exploit details. Response times are best effort; no SLA is offered.

## Trust boundaries

Review code before running it. Pull requests can change install scripts, tests,
Vite configuration and build tooling. An approved CI or preview deployment runs
that code; approval is a trust decision, not just permission to view a preview.

CI must not receive npm publishing credentials or production secrets. Releases
remain a separate maintainer operation. Public example applications are not
production authentication, authorization or database configurations.
