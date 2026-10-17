import { REQUEST_CONTEXT, DestroyRef, inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { HttpBackend, FetchBackend, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { from, map } from 'rxjs';
import { App } from './app/app';
import { createAppConfig } from './app/app.config';
import type { RenderContext } from './shared/render-context';

// Il backend opera DOPO gli interceptor Angular, inclusa la transfer cache nativa.
// Un interceptor che risponde prima di next() scavalcherebbe quella cache.
function localApiBackend(): HttpBackend {
  const upstream = inject(FetchBackend);
  const context = inject(REQUEST_CONTEXT) as RenderContext;
  return {
    handle(request) {
      const target = new URL(request.urlWithParams, 'http://fastang.local');
      if (target.origin !== 'http://fastang.local' || !target.pathname.startsWith('/api/')) return upstream.handle(request);
      const headers = Object.fromEntries(request.headers.keys().map((key) => [key, request.headers.get(key)!]));
      const contentType = request.detectContentTypeHeader();
      if (contentType && !request.headers.has('content-type')) headers['content-type'] = contentType;
      return from(context.dispatchApi(target.pathname + target.search, request.method, request.body, headers)).pipe(
        map((response) => {
          const responseHeaders = new HttpHeaders(response.headers);
          if (response.status >= 400) throw new HttpErrorResponse({ status: response.status, error: response.body, headers: responseHeaders, url: request.url });
          return new HttpResponse({ status: response.status, body: response.body, headers: responseHeaders, url: request.url });
        }),
      );
    },
  };
}

export async function render(url: string, document: string, context: RenderContext): Promise<string> {
  // I provider con stato mutabile vengono ricreati per ogni applicazione SSR.
  const config = mergeApplicationConfig(createAppConfig(), {
    providers: [
      provideServerRendering(),
      { provide: HttpBackend, useFactory: localApiBackend },
      provideAppInitializer(() => {
        const router = inject(Router);
        const target = new URL(url);
        const incoming = router.serializeUrl(router.parseUrl(target.pathname + target.search + target.hash));
        const subscription = router.events.subscribe((event) => {
          if (event instanceof NavigationEnd) {
            // Confronta URL canoniche Angular, non la codifica originale della query.
            context.redirect = event.urlAfterRedirects === incoming
              ? undefined
              : { location: event.urlAfterRedirects, status: 302 };
          }
        });
        inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
      }),
    ],
  });
  return renderApplication(
    (bootstrapContext) => bootstrapApplication(App, config, bootstrapContext),
    { url, document, allowedHosts: ['fastang.local'], platformProviders: [{ provide: REQUEST_CONTEXT, useValue: context }] },
  );
}
