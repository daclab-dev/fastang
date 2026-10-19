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

## Render deadlines and cancellation (0.1.0-alpha.6)

`createServer` from `@fastang/core/server` bounds template loading and SSR to
30,000 ms per request. Set `renderTimeoutMs` in its options to a positive integer
(up to 2,147,483,647 ms). This is a server option, not a `fastang.config.ts` key.
The development server uses the same default. Prerendered files and direct API
requests are outside this deadline. Hosting platforms can impose shorter limits.

A deadline returns HTTP 504 with `{ "error": "SSR rendering timed out" }` and
`Cache-Control: private, no-store`; queued response cookies and redirects are
discarded. Client disconnection cancels that render. Server shutdown cancels
active renders with HTTP 503 when the connection is still writable. Ordinary
render failures retain the generic HTTP 500 response.

`RenderContext.signal` is an optional `AbortSignal` for compatibility with custom
contexts; `createServer` always supplies it. Pass it to cancellable operations
such as `fetch(url, { signal: context.signal })`. The `template` callback also
receives the signal as its second argument. Internal `dispatchApi` calls
inherit it; `ApiDispatchOptions.signal` can cancel an individual call without
cancelling the page. Unsubscribing from Angular's local HTTP backend cancels that
call's injected transport. External HttpClient requests are unsubscribed on
render cancellation and use Angular's fetch cancellation.

The Angular renderer stops waiting for bootstrap or application stability when
cancelled. It rejects inside `renderApplication`, allowing Angular to destroy the
request's platform and providers through its normal cleanup. It does not call
`destroyPlatform()` or destroy another request's application.

Cancellation is cooperative. Aborting an injected request does not undo a
Fastify handler's side effects or stop a database query which ignores
cancellation. Custom renderers must observe the signal and release their own
resources. Angular's public `renderApplication` API has no cancellation option:
asynchronous `BEFORE_APP_SERIALIZED` callbacks that have already started can
continue after the response deadline, until they settle. Synchronous CPU work
cannot be interrupted by a Node timer. These deadlines bound response waiting;
they are not process isolation or a hard execution limit.
