# Errori, redirect e 404

Distingui gli errori API dalla risposta HTML e usa le guard Angular per i redirect.

## Gestisci gli errori nel resolver

Sostituisci il file della rotta del saluto con questo esempio. La guard controlla prima l'accesso alla rotta; il resolver gestisce gli errori dell'API senza lasciare la navigazione incompleta.

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
  return inject(HttpClient).get<{ message: string }>('/api/greet/' + encodeURIComponent(route.paramMap.get('name')!)).pipe(
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

Apri `/greet/Ada?preview=blocked`: durante SSR ottieni HTTP 302 verso `/about`, con header `Location` e body vuoto. Nel browser Angular naviga alla destinazione. La guard è dimostrativa: non implementa autenticazione e non protegge direttamente un'API.

Se l'API fallisce, la pagina mostra `Greeting unavailable.`. Nel rendering sul server il contesto imposta HTTP 404 per una risposta API 404 e HTTP 502 per gli altri errori. Nel browser `REQUEST_CONTEXT` è nullo: una navigazione client non può cambiare lo stato HTTP di un documento già ricevuto.

## Una pagina 404

Lo starter include già questo catch-all terminale.

```ts file=src/app/pages/[...slug].page.ts
import { Component, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RenderContext } from '@fastang/core';
@Component({ imports: [RouterLink], template: `<h1>Page not found</h1><a routerLink="/">Back home</a>` })
export default class NotFoundPage {
  constructor() { const context = inject(REQUEST_CONTEXT) as RenderContext | null; if (context) context.status = 404; }
}
```

Restituire solo un testo con scritto 404 non cambia lo stato della risposta. Il contesto SSR serve proprio a rendere HTTP 404 una pagina non trovata.

## Limiti dei redirect

Il renderer rileva la destinazione finale del router. Il rendering raggiunge la pagina di destinazione prima di emettere il redirect: non viene interrotto anticipatamente. Il bridge accetta destinazioni locali; gli URL esterni e le destinazioni ambigue vengono rifiutati. I redirect restituiti da una chiamata API interna non sono propagati automaticamente alla risposta HTML.

Per plugin e configurazione continua con [il server](configuration.md).
