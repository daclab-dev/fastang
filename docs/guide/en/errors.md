# Errors, redirects and 404s

Distinguish API errors from HTML responses and use Angular guards for redirects.

## Handle resolver errors

Replace the greeting route file with this example. The guard runs before route activation; the resolver handles API failures without leaving navigation incomplete.

```ts file=src/app/pages/greet/[name].route.ts
import { REQUEST_CONTEXT, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, type CanActivateFn, type ResolveFn, type Route } from '@angular/router';
import { catchError, of } from 'rxjs';
import type { RenderContext } from '@fastang/core';

const previewGuard: CanActivateFn = route => route.queryParamMap.get('preview') === 'blocked'
  ? inject(Router).createUrlTree(['/about'])
  : true;

const greeting: ResolveFn<{ message: string }> = route => {
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  return inject(HttpClient)
    .get<{ message: string }>(
      '/api/greet/' + encodeURIComponent(route.paramMap.get('name')!),
    )
    .pipe(
      catchError((error: HttpErrorResponse) => {
        if (context) context.status = error.status === 404 ? 404 : 502;
        return of({ message: 'Greeting unavailable.' });
      }),
    );
};

export default {
  title: 'Greeting · FastAng',
  canActivate: [previewGuard],
  resolve: { greeting },
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
} satisfies Pick<Route, 'title' | 'canActivate' | 'resolve' | 'runGuardsAndResolvers'>;
```

Open `/greet/Ada?preview=blocked`: SSR returns HTTP 302 to `/about`, a `Location` header and an empty body. In the browser Angular navigates to the destination. This guard is a demo: it does not implement authentication or protect an API directly.

If the API fails, the page displays `Greeting unavailable.`. During server rendering, the context sets HTTP 404 for an API 404 and HTTP 502 for other failures. In the browser, `REQUEST_CONTEXT` is null: client navigation cannot change the HTTP status of an already received document.

## A 404 page

The starter already includes this terminal catch-all.

```ts file=src/app/pages/[...slug].page.ts
import { Component, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RenderContext } from '@fastang/core';

@Component({
  imports: [RouterLink],
  template: `
    <h1>Page not found</h1>
    <a routerLink="/">Back home</a>
  `,
})
export default class NotFoundPage {
  constructor() {
    const context = inject(REQUEST_CONTEXT) as RenderContext | null;
    if (context) {
      context.status = 404;
    }
  }
}
```

Displaying the text 404 alone does not change the response status. The SSR context makes the not-found page return HTTP 404.

## Redirect limits

The renderer detects the router's final destination. Rendering reaches the destination page before emitting the redirect; it does not stop bootstrap early. The bridge accepts local destinations and rejects external or ambiguous URLs. Redirects from internal API calls are not automatically propagated into the HTML response.

Continue with [server configuration and plugins](configuration.md).
