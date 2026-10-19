# Reactive route data with Signals

Use native Angular Route Resources with FastAng file-based routing and typed API contracts.

## Status and setup

This example targets Angular 22.2.3. `withRouterResources()` and route `resources`
are developer preview APIs. They are opt-in; the generated starter keeps stable
resolvers. FastAng remains zoneless. This example adds no FastAng resource wrapper.

Install `@sinclair/typebox@^0.34.41` in your starter. Copy the complete files below,
then run `npm run build` and open `/resources/Ada` after starting the server.
For pnpm use `pnpm add @sinclair/typebox@^0.34.41` and `pnpm run build`.

The configuration replaces `app.config.ts`. In an existing app merge the providers
and choose your own navigation-error policy. The example replaces the greeting
endpoint with its contract-based equivalent; keep the existing resolver and page.

## Application configuration

Angular owns routing and resources. FastAng passes route metadata through to the
native router. The error handler below sends failed navigations to a demo error
page; it does not infer HTTP 404 or provide authentication.

```ts file=src/app/app.config.ts
import { inject, type ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import {
  provideRouter, withComponentInputBinding, withRouterResources,
  withNavigationErrorHandler, RedirectCommand, Router,
} from '@angular/router';
import { createRoutes } from './fastang.routes';

export function createAppConfig(): ApplicationConfig {
  return {
    providers: [
      provideRouter(
        createRoutes(),
        withComponentInputBinding(),
        withRouterResources(),
        // Demo policy: show a dedicated page if a blocking resource fails.
        withNavigationErrorHandler(() =>
          new RedirectCommand(inject(Router).parseUrl('/resource-error')),
        ),
      ),
      provideHttpClient(withFetch()),
      provideClientHydration(),
    ],
  };
}
```

## Shared contract and endpoint

```ts file=src/shared/greeting.ts
import { Type } from '@sinclair/typebox';
import { defineApiContract } from '@fastang/core/contracts';

export const greetingContract = defineApiContract({
  method: 'GET', path: '/api/greet/:name',
  schema: {
    params: Type.Object({ name: Type.String({ minLength: 1, maxLength: 80 }) }),
    response: { 200: Type.Object({ message: Type.String() }, { additionalProperties: false }) },
  },
});
```

```ts file=src/server/api/greet/[name].get.ts
import { defineContractRoute } from '@fastang/core/contract-route';
import { greetingContract } from '../../../shared/greeting';

export default defineContractRoute(greetingContract, {
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
```

## Reactive route metadata

```ts file=src/app/pages/resources/[name].route.ts
import { httpResource } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { Router, type Route } from '@angular/router';
import { apiUrl, type ApiSuccess } from '@fastang/core/contracts';
import { greetingContract } from '../../../shared/greeting';

export default {
  title: 'Reactive greeting · FastAng',
  canActivate: [route => route.queryParamMap.get('preview') === 'blocked'
    ? inject(Router).createUrlTree(['/about'])
    : true],
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  resources: ({ params }) => {
    // Keep unrelated query navigation from rebuilding the HTTP request.
    const name = computed(() => params()['name']);
    return {
      greeting: httpResource<ApiSuccess<typeof greetingContract>>(() =>
        apiUrl(greetingContract, { params: { name: name() } }),
      ),
    };
  },
} satisfies Pick<Route, 'title' | 'canActivate' | 'runGuardsAndResolvers' | 'resources'>;
```

## Signal Inputs and error page

```ts file=src/app/pages/resources/[name].page.ts
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ApiSuccess } from '@fastang/core/contracts';
import type { greetingContract } from '../../../shared/greeting';

@Component({
  imports: [RouterLink],
  template: `
    <p class="eyebrow">ROUTER RESOURCES / DEVELOPER PREVIEW</p>
    <h1>{{ greeting().message }}</h1>
    <p>Route parameter: <strong>{{ name() }}</strong></p>
    @if (mode() === 'details') {
      <p data-testid="resource-details">
        A typed contract builds the URL. Angular loads the resource before activation.
      </p>
    }
    <nav aria-label="Reactive greetings">
      <a routerLink="/resources/Ada">Ada</a>
      <a routerLink="/resources/Grace">Grace</a>
      <a [routerLink]="['/resources', name()]" [queryParams]="{ mode: 'details' }">Details</a>
      <a [routerLink]="['/resources', invalidName]">API failure</a>
      <a [routerLink]="['/resources', name()]" [queryParams]="{ preview: 'blocked' }">Redirect</a>
    </nav>
    @if (navigating()) { <p role="status">Loading page…</p> }
  `,
})
export default class ResourceGreetingPage {
  readonly name = input.required<string>();
  readonly greeting = input.required<ApiSuccess<typeof greetingContract>>();
  readonly mode = input('summary', {
    transform: (value: string | undefined) => value === 'details' ? 'details' : 'summary',
  });
  private readonly router = inject(Router);
  readonly navigating = computed(() => this.router.currentNavigation() !== null);
  readonly invalidName = 'a'.repeat(81);
}
```

```ts file=src/app/pages/resource-error.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <h1>Greeting unavailable.</h1>
    <p>The navigation failed. Try a valid name or return to your application.</p>
    <a routerLink="/resources/Ada">Try again</a>
  `,
})
export default class ResourceErrorPage {}
```

## Behavior to verify

- Load `/resources/Ada`: SSR includes `Hello, Ada!`; the blocking resource value
  reaches the `greeting` input before the component activates.
- Navigate to Grace: `name` changes and the resource loads the new API URL.
- Choose Details: `mode` changes without reloading the greeting. Only `name` is a
  dependency of the resource URL. Missing or unrecognized `mode` means `summary`.
- Choose API failure: validation rejects the oversized name. The navigation error
  handler redirects to `/resource-error`; Try again recovers with a valid name.
- Choose Redirect: the guard sends navigation to `/about` before loading the resource.

Signal Input types do not validate URL values. The `mode` transform normalizes
its query input; the API validates the name through the contract. `apiUrl` infers
URL inputs, and `ApiSuccess` supplies the response type; neither validates the
response in the browser.

The `computed` isolates the name from replacement parameter objects during query
navigation. `runGuardsAndResolvers` also reruns the guard when query values change.

## SSR and compatibility boundaries

`httpResource` uses HttpClient, including the local SSR dispatch and native HTTP
transfer cache. Eligible public responses are reused during hydration. Requests
carrying Cookie or Authorization are excluded and may fetch again in the browser.
No shared HTML cache is introduced. Resource instances must be created inside
the route factory; never export a resource instance as module-level shared state.

This example covers blocking `httpResource` route resources. It does not claim
blanket compatibility for `nonBlocking`, arbitrary `resource` loaders or direct
`fetch`, which may bypass the HTTP bridge. Keep the stable
[resolver approach](rendering.md) when you do not want preview APIs.

The repository browser suite tests the packaged example across Chromium, Firefox
and WebKit, including mobile emulation. See the
[Angular Route Resources guide](https://angular.dev/guide/routing/data-fetching-with-resources)
for native API semantics.
