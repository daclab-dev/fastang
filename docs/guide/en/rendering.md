# Data, SSR and prerendering

Load data with HttpClient and choose which URLs can be generated during the build.

## An Angular resolver

In the starter, the resolver reads the `name` parameter and calls the local API. These are the two complete files already present in the project.

```ts file=src/app/pages/greet/[name].route.ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ResolveFn } from '@angular/router';
const greeting: ResolveFn<{ message: string }> = route => inject(HttpClient).get<{ message: string }>('/api/greet/' + encodeURIComponent(route.paramMap.get('name')!));
export default { title: 'Greeting · FastAng', resolve: { greeting } };
```

```ts file=src/app/pages/greet/[name].page.ts
import { Component, input } from '@angular/core';
@Component({ template: `<p class="eyebrow">SERVER RENDERED</p><h1>{{ greeting().message }}</h1><p>The Angular resolver calls a validated Fastify endpoint. Hydration reuses its response.</p>` })
export default class GreetingPage { readonly greeting = input.required<{ message: string }>(); }
```

The starter enables `withComponentInputBinding()`, so data resolved under `greeting` reaches the input with the same name.


On the repository main branch (next alpha), response cookies can be forwarded only by explicit server dispatch, and credentialed API responses are excluded from the default hydration cache. Internal API redirects remain explicit. See the [SSR HTTP contract](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions).


## What happens during SSR

The renderer uses public Angular APIs. An HttpClient call to `/api/...` goes through `Fastify.inject()` in the same application, after interceptors. There is no need to start another server or call localhost from the renderer.

For eligible responses, Angular's HTTP transfer cache passes the data to the browser during hydration. External-origin requests use the fetch backend. The bridge forwards cookies, authorization and `x-request-label` from the incoming request; each render has a separate context. Automatically propagating API `Set-Cookie` headers and redirects into HTML responses is not implemented.

## Explicit prerendering

Replace `fastang.config.ts` with this file to also generate the public greeting during the build.

```ts file=fastang.config.ts
import { defineConfig } from '@fastang/core';

export default defineConfig({
  prerender: ['/about', '/greet/world'],
  vercel: { functions: 'routes' },
});
```

List concrete URLs, including for parameterized pages. In this alpha, `/`, `/api` and asset paths are reserved; prerender paths cannot include query strings. A response other than HTTP 200 fails the build. Do not list URLs that depend on cookies or personal data.

`/greet/world` uses generated HTML; `/greet/Ada` continues to use SSR. Both use SSR in development. SSR responses are private and have no shared HTML cache; ISR is not implemented.

Continue with [errors and redirects](errors.md). Read about the lifecycle of [Angular resolvers](https://angular.dev/guide/routing/data-resolvers).
