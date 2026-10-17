# FastAng session example

A single-account authentication example using the official `@fastify/secure-session`
and `@fastify/rate-limit` plugins. Angular supplies the UI and route resolver;
Fastify enforces authentication on the session API. This example is separate from
the minimal starter and is not included in the generator's npm package.

From a FastAng repository checkout:

```sh
npm ci
npm run create:auth -- /absolute/path/my-auth-app
cd /absolute/path/my-auth-app
node --env-file=.env node_modules/@fastang/core/bin/fastang.mjs dev
```

Open http://localhost:3278/login. The helper creates a private `.env` with random
session key and demo password; inspect it locally to retrieve the password.
Keep `.env` out of version control. For a different port, update both `AUTH_ORIGIN`
and `PORT` in `.env`. Set `HOST=127.0.0.1` for local development.

For a production build:

```sh
node --env-file=.env node_modules/@fastang/core/bin/fastang.mjs build
node --env-file=.env dist/server/index.js
```

Node's `--env-file` explicitly loads configuration; FastAng does not load `.env`
automatically. `AUTH_ORIGIN` must be the exact public origin, using HTTPS outside
loopback development. Set all three `AUTH_*` variables in your deployment provider
before building or running. Never put them in Angular configuration or `VITE_*`
variables. `npm run build:vercel` uses environment variables supplied by the host.

To apply manually to a generated starter, install `@fastify/secure-session@8.4.1`
and `@fastify/rate-limit@11.2.1`, copy this example's `src/` over its `src/`, copy
`scripts/prepare-vercel.mjs`, append `&& node scripts/prepare-vercel.mjs` to the
`build:vercel` script, and supply:

- `AUTH_SESSION_KEY`: random 32-byte key encoded as 64 hexadecimal characters.
- `AUTH_DEMO_PASSWORD`: a strong demo password, at least 16 characters.
- `AUTH_ORIGIN`: for example `http://localhost:3278` or `https://your-domain.dev`.

## Behavior

- `/login` posts credentials directly from the browser to `/api/auth/login`.
- `/account` resolves `/api/auth/session` with `transferCache: false`; HTTP 401
  redirects to `/login` through Angular's `RedirectCommand`, including SSR.
- The session API independently returns HTTP 401 without a valid encrypted cookie.
- Login resets the previous session. Logout expires the browser cookie.
- Cookies are HttpOnly, SameSite=Lax, expire after one hour and use Secure plus
  the `__Host-` prefix on HTTPS. Cookies and passwords are not serialized into HTML.
- State-changing requests require an exact Origin match; missing and `null` origins fail.
- Login is limited to ten attempts per minute per client address per instance.
- Responses from these endpoints are private and have no shared cache.

## Scope and deployment

The configured password is a **single-account demo credential**, compared through
fixed-length hashes. Replace that check with your identity provider or a user
store with password hashing, recovery and account lifecycle management. This is
not an identity service or a production authentication starter.

Sessions are stateless encrypted cookies: they work across instances sharing the
same key, but logout cannot revoke a copied cookie before its expiration. Use a
server-side session store or identity provider when immediate revocation is
required. Do not put sensitive account data in session payloads.

The rate limiter's default store is local to each process. A distributed deployment
needs a shared limiter store and carefully configured proxy/client IP handling.
Key rotation, distributed revocation and account management are application concerns.
The session plugin includes a native dependency. The example's Vercel postbuild
script explicitly copies its published prebuilds into each function because the
tracer does not recognize the plugin's dynamic addon loader. This adds native
files after the framework's bundle-size report; that report does not include
these additions. Validate the actual output against your target and size limits.
The repository checks login and session access in a packaged Vercel function as
well as browser SSR behavior. This is not a live deployment verification.

## Checks

From the repository, run `npm test` for API/CSRF/cookie/rate-limit checks and
`npm run test:auth` for a production build, browser login/SSR/logout on all five
browser profiles, and a packaged Vercel API function. Install browsers first with
`npx playwright install --with-deps chromium firefox webkit`.

[Secure session documentation](https://github.com/fastify/fastify-secure-session)
· [Rate limiter documentation](https://github.com/fastify/fastify-rate-limit)
