import type { ApplicationConfig, Type } from '@angular/core';
import { REQUEST_CONTEXT, DestroyRef, inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { HttpBackend, FetchBackend, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { withAbort } from './abort.ts';
import type { RenderContext } from './render-context.ts';

// Il backend opera DOPO gli interceptor Angular, inclusa la transfer cache nativa.
// Un interceptor che risponde prima di next() scavalcherebbe quella cache.
function localApiBackend(): HttpBackend {
  const upstream = inject(FetchBackend);
  const context = inject(REQUEST_CONTEXT) as RenderContext;
  return {
    handle(request) {
      const target = new URL(request.urlWithParams, 'http://fastang.local');
      if (target.origin !== 'http://fastang.local' || !target.pathname.startsWith('/api/')) {
        return new Observable(subscriber => {
          const signal = context.signal;
          if (signal?.aborted) { subscriber.error(signal.reason); return; }
          const aborted = () => subscriber.error(signal!.reason);
          signal?.addEventListener('abort', aborted, { once: true });
          const subscription = upstream.handle(request).subscribe(subscriber);
          return () => {
            signal?.removeEventListener('abort', aborted);
            subscription.unsubscribe();
          };
        });
      }
      const headers = Object.fromEntries(request.headers.keys().map((key) => [key, request.headers.get(key)!]));
      const contentType = request.detectContentTypeHeader();
      if (contentType && !request.headers.has('content-type')) headers['content-type'] = contentType;
      return new Observable<Awaited<ReturnType<RenderContext['dispatchApi']>>>(subscriber => {
        const controller = new AbortController();
        context.dispatchApi(target.pathname + target.search, request.method, request.body, headers, { signal: controller.signal })
          .then(response => { subscriber.next(response); subscriber.complete(); }, error => subscriber.error(error));
        return () => controller.abort(new Error('SSR HTTP subscription disposed'));
      }).pipe(
        map((response) => {
          let responseHeaders = new HttpHeaders(response.headers);
          // Inherited credentials were invisible to the transfer-cache request check.
          // Mark the response private so Angular's native response check excludes it.
          if (response.credentialed) responseHeaders = responseHeaders.set('cache-control', 'private, no-store');
          if (response.status < 200 || response.status >= 300) throw new HttpErrorResponse({ status: response.status, error: response.body, headers: responseHeaders, url: request.url });
          return new HttpResponse({ status: response.status, body: response.body, headers: responseHeaders, url: request.url });
        }),
      );
    },
  };
}

export function createRenderer(App: Type<unknown>, createAppConfig: () => ApplicationConfig) {
return async function render(url: string, document: string, context: RenderContext): Promise<string> {
  context.signal?.throwIfAborted();
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
    async (bootstrapContext) => {
      // Fail inside renderApplication so its finally block owns platform cleanup.
      const application = await withAbort(bootstrapApplication(App, config, bootstrapContext), context.signal);
      await withAbort(application.whenStable(), context.signal);
      context.signal?.throwIfAborted();
      return application;
    },
    { url, document, allowedHosts: ['fastang.local'], platformProviders: [{ provide: REQUEST_CONTEXT, useValue: context }] },
  );
}

}
