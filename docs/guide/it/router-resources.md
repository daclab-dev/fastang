# Dati di rotta reattivi con Signals

Usa le Route Resources native di Angular con il routing su file e i contratti API di FastAng.

## Stato e preparazione

Questo esempio usa Angular 22.2.3. `withRouterResources()` e `resources` nelle route
sono API in developer preview. Si abilitano esplicitamente; lo starter generato
mantiene i resolver stabili. FastAng resta zoneless. L’esempio non introduce wrapper
FastAng per le risorse.

Installa `@sinclair/typebox@^0.34.41` nello starter. Copia i file completi sotto,
poi esegui `npm run build` e apri `/resources/Ada` dopo aver avviato il server.
Con pnpm usa `pnpm add @sinclair/typebox@^0.34.41` e `pnpm run build`.

La configurazione sostituisce `app.config.ts`. In un’app esistente integra i provider
e scegli la tua politica per gli errori di navigazione. L’esempio sostituisce
l’endpoint del saluto con la versione a contratto; conserva resolver e pagina esistenti.

## Configurazione dell’applicazione

Router e risorse appartengono ad Angular. FastAng inoltra i metadati al router
nativo. L’handler sotto porta le navigazioni fallite a una pagina di errore
dimostrativa; non deduce lo stato HTTP 404 e non implementa autenticazione.

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

## Contratto condiviso ed endpoint

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

## Metadati reattivi della rotta

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

## Signal Input e pagina di errore

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

## Comportamento da verificare

- Apri `/resources/Ada`: l’HTML SSR contiene `Hello, Ada!`; il valore della risorsa
  bloccante arriva all’input `greeting` prima dell’attivazione del componente.
- Naviga a Grace: cambia `name` e la risorsa carica il nuovo URL dell’API.
- Scegli Details: cambia `mode` senza ricaricare il saluto. Solo `name` è una
  dipendenza dell’URL. Se `mode` manca o non è riconosciuto vale `summary`.
- Scegli API failure: la validazione rifiuta il nome troppo lungo. L’handler degli
  errori di navigazione porta a `/resource-error`; Try again permette di riprovare.
- Scegli Redirect: la guard porta a `/about` prima del caricamento della risorsa.

I tipi dei Signal Input non validano gli URL. La trasformazione di `mode` normalizza
la query; l’API valida il nome con il contratto. `apiUrl` inferisce gli input
dell’URL e `ApiSuccess` il tipo della risposta; non validano la risposta nel browser.

Il `computed` isola il nome dalla sostituzione degli oggetti dei parametri durante
le navigazioni con query. `runGuardsAndResolvers` riesegue anche la guard quando
cambiano i valori della query.

## SSR e limiti di compatibilità

`httpResource` usa HttpClient, incluso il dispatch locale SSR e la transfer cache
HTTP nativa. Le risposte pubbliche idonee vengono riusate durante l’idratazione.
Le richieste con Cookie o Authorization sono escluse e possono essere ripetute
nel browser. Non viene introdotta una cache HTML condivisa. Crea le risorse nella
factory della route, senza condividere istanze nello stato globale di un modulo.

L’esempio copre Route Resources bloccanti con `httpResource`. Non promette supporto
generale a `nonBlocking`, loader `resource` arbitrari o `fetch` diretto, che possono
scavalcare il bridge HTTP. Mantieni il
[percorso con resolver](rendering.md) se non vuoi usare API in preview.

La suite browser del repository verifica l’esempio pacchettizzato con Chromium,
Firefox e WebKit, inclusa emulazione mobile. Consulta la
[guida Angular alle Route Resources](https://angular.dev/guide/routing/data-fetching-with-resources)
per la semantica delle API native.
