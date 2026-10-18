# Dati, SSR e prerendering

Carica i dati con HttpClient e scegli quali URL possono essere generati durante la build.

## Un resolver Angular

Nello starter, il resolver riceve il parametro `name` e chiama l'API locale. Questi sono i due file completi già presenti nel progetto.

```ts file=src/app/pages/greet/[name].route.ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ResolveFn } from '@angular/router';

const greeting: ResolveFn<{ message: string }> = route =>
  inject(HttpClient).get<{ message: string }>(
    '/api/greet/' + encodeURIComponent(route.paramMap.get('name')!),
  );

export default {
  title: 'Greeting · FastAng',
  resolve: { greeting },
};
```

```ts file=src/app/pages/greet/[name].page.ts
import { Component, input } from '@angular/core';

@Component({
  template: `
    <p class="eyebrow">SERVER RENDERED</p>
    <h1>{{ greeting().message }}</h1>
    <p>
      The Angular resolver calls a validated Fastify endpoint.
      Hydration reuses its response.
    </p>
  `,
})
export default class GreetingPage {
  readonly greeting = input.required<{ message: string }>();
}
```

Lo starter attiva `withComponentInputBinding()`, quindi il dato risolto con la chiave `greeting` arriva all'input omonimo.


Da `0.1.0-alpha.1`, i cookie di risposta si possono inoltrare solo tramite dispatch server esplicito e le risposte API con credenziali sono escluse dalla cache di idratazione predefinita. I redirect API interni restano espliciti. Vedi il [contratto HTTP SSR](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions).


## Cosa succede durante SSR

Il renderer usa le API pubbliche Angular. Una chiamata HttpClient a `/api/...` viene inoltrata a `Fastify.inject()` nella stessa applicazione, dopo gli interceptor. Non occorre avviare un secondo server o chiamare localhost dal renderer.

Per le risposte idonee, la HTTP transfer cache Angular trasferisce i dati al browser durante l'idratazione. Le chiamate a origini esterne usano il backend fetch. Il bridge inoltra cookie, authorization e `x-request-label` della richiesta in entrata; il contesto è distinto per ogni rendering. La propagazione automatica di `Set-Cookie` e redirect dalle API all'HTML non è implementata.

## Prerendering esplicito

Sostituisci `fastang.config.ts` con questo file per generare anche il saluto pubblico durante la build.

```ts file=fastang.config.ts
import { defineConfig } from '@fastang/core';

export default defineConfig({
  prerender: ['/about', '/greet/world'],
  vercel: { functions: 'routes' },
});
```

Usa URL concreti, anche per pagine parametriche. In questa alpha la root `/`, `/api` e i percorsi di asset sono riservati; i percorsi di prerendering non accettano query string. Una risposta non HTTP 200 interrompe la build. Non elencare URL che dipendono da cookie o dati personali.

`/greet/world` è servita dall'HTML generato; `/greet/Ada` continua a usare SSR. In sviluppo entrambe usano SSR. Le risposte SSR sono private e non memorizzate in una cache HTML condivisa; non c'è ISR.

Continua con [errori e redirect](errors.md). Consulta [i resolver Angular](https://angular.dev/guide/routing/data-resolvers) per il loro lifecycle.
