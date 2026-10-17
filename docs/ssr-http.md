# SSR HTTP contract

Available from `@fastang/core@0.1.0-alpha.1`.

## Requests and sessions

During rendering, Angular HttpClient calls to local `/api/...` URLs use the
application's Fastify instance. Incoming `Cookie`, `Authorization` and
`x-request-label` headers are inherited. Explicit headers override inherited
ones case-insensitively. No other incoming headers are inherited. External HTTP
requests use Angular's fetch backend and do not inherit these credentials.

Every render owns its context. FastAng does not create a cookie jar: cookies set
by one internal call do not change the credentials of subsequent calls. Sessions
and cookie signing remain the application's Fastify plugin responsibilities.
Login/logout should normally use browser-to-API requests, where the browser
handles cookies. FastAng does not supply authentication or CSRF protection.

## Response cookies

Internal dispatch results retain `headers['set-cookie']` as a string or separate
string array. Values are never comma-joined: `Expires` itself contains commas.
API cookies do not reach the HTML response by default. Server-only application
code can request forwarding for a selected call:

```ts
const result = await context.dispatchApi('/api/session/refresh', 'POST', null, {}, {
  forwardSetCookie: true,
});
```

This is an explicit state-changing operation, not a recommended resolver pattern.
The application decides whether and when it is appropriate. The option forwards
all cookies from that call, preserving order and attributes. It does not forward
arbitrary response headers or change cookies in later internal calls. Multiple
opted-in calls append their cookies in completion order; do not rely on order
between concurrent session mutations.

Forwarded cookies are attached after successful rendering, including an explicit
HTML redirect. A thrown render or an invalid redirect discards queued cookies.
SSR responses remain `private, no-store`. Public prerendering rejects a page
response containing `Set-Cookie`.

## Redirects and errors

Internal API redirects are not followed and do not redirect the HTML response.
`dispatchApi` returns their status and Location for explicit handling. Angular
HttpClient treats non-2xx responses, including 3xx, as HttpErrorResponse. Use an
Angular guard returning UrlTree for page redirects; server-only code may set
`context.redirect`. HTML redirects only accept local destinations.

## Hydration cache

The bridge runs after Angular interceptors. For calls that actually carry Cookie
or Authorization, it marks the Angular response `private, no-store`. Angular's
default transfer cache therefore excludes these responses even when credentials
were inherited invisibly inside dispatch. Angular also excludes Set-Cookie
responses by default. Public, eligible API responses retain native transfer-cache
behavior.

Do not enable `includeNonCacheableRequests` for private calls: that Angular option
explicitly overrides these response exclusions. Use `transferCache: false` for
sensitive HttpClient requests; templates, custom TransferState and explicit
header serialization remain application responsibilities. This contract does
not prevent application code from rendering private data into its own response.

References: [Angular SSR and HTTP transfer cache](https://angular.dev/best-practices/performance/ssr),
[Fastify reply headers](https://fastify.dev/docs/latest/Reference/Reply/).
