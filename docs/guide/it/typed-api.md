# Contratti API tipizzati e condivisi

Dalla versione `0.1.0-alpha.3`, un contratto TypeBox condiviso permette di inferire
i tipi degli handler Fastify e delle richieste e risposte JSON Angular dagli
stessi schemi runtime. È opzionale: lo starter minimo e `defineApiRoute()`
funzionano senza TypeBox.

## Installa la libreria opzionale per gli schemi

```sh
npm install @sinclair/typebox@^0.34.41
```

Parti dallo starter generato. Mantieni la pagina greeting e sostituisci i file
seguenti. I moduli condivisi non devono importare codice server o segreti.

## Definisci il contratto

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

Il percorso deve corrispondere esattamente alla rotta API generata. Parametri,
query e body JSON vengono validati da Fastify; gli schemi di risposta controllano
la serializzazione. Cambiare il contratto non genera né rinomina i file delle rotte.

## Registra l’handler Fastify

```ts file=src/server/api/greet/[name].get.ts
import { defineContractRoute } from '@fastang/core/contract-route';
import { greetingContract } from '../../../shared/greeting';

export default defineContractRoute(greetingContract, {
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
```

`request.params.name` viene inferito come stringa. Sono supportate opzioni native
Fastify come `preHandler` e `bodyLimit`. Metodo, URL e schema non possono essere
sovrascritti nelle opzioni. Dichiara nel contratto anche gli stati di errore
restituiti da hook o handler.

## Chiama l’API tramite Angular

```ts file=src/app/pages/greet/[name].route.ts
import type { ResolveFn } from '@angular/router';
import { injectApiClient } from '@fastang/core/http-client';
import type { ApiSuccess } from '@fastang/core/contracts';
import { greetingContract } from '../../../shared/greeting';

const greeting: ResolveFn<ApiSuccess<typeof greetingContract>> = route =>
  injectApiClient().request(greetingContract, { params: { name: route.paramMap.get('name')! } });

export default { title: 'Greeting · FastAng', resolve: { greeting } };
```

`injectApiClient()` usa HttpClient Angular: interceptor, dispatch locale SSR e
cache di idratazione continuano a funzionare. `ApiSuccess` è l’unione dei body
delle risposte 2xx. Gli errori HTTP restano oggetti `HttpErrorResponse` nativi;
non diventano valori di successo.

Visita `/greet/world`: la pagina esistente riceve `{ message: 'Hello, world!' }`
tramite l’input del resolver. La [guida al rendering](rendering.md) descrive il
flusso SSR e idratazione.

## Limiti

Usa `schema.querystring` per lo schema della query e passa `query` al client;
usa `schema.body` e passa `body` per l’input JSON. Ogni schema di input dichiarato
richiede il campo corrispondente nella richiesta, anche se le sue proprietà sono
opzionali. I parametri del percorso vengono codificati; gli array semplici nella
query diventano chiavi ripetute. Gli oggetti query annidati non sono supportati.

I contratti supportano GET, POST, PUT, PATCH e DELETE con percorsi locali
`/api/...` statici o parametrizzati e risposte JSON. Per wildcard, upload,
streaming, avanzamento o osservazione della risposta completa usa HttpClient
nativo e `defineApiRoute()`. I tipi delle risposte nel browser non sono validazione
runtime: il disallineamento tra versioni client e server richiede ancora gestione
applicativa. Il [contratto HTTP SSR](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions)
descrive credenziali e cache.
