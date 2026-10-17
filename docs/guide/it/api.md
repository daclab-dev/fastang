# API Fastify e validazione

Registra endpoint tipizzati con schemi runtime, usando direttamente richieste e risposte Fastify.

## Nomi e metodi

`src/server/api/health.get.ts` diventa `GET /api/health`. Puoi usare i suffissi `get`, `post`, `put`, `patch`, `delete`, `head` e `options`. `[name]` crea un parametro dinamico; i file senza metodo restano helper e non sono registrati.

## Crea un endpoint POST

Aggiungi questo file allo starter. Il tipo TypeScript descrive il body nell'handler; lo schema lo verifica a runtime e definisce la risposta serializzata.

```ts file=src/server/api/messages.post.ts
import { defineApiRoute } from '@fastang/core';

export default defineApiRoute<{ Body: { text: string } }>({
  schema: {
    body: {
      type: 'object', required: ['text'], additionalProperties: false,
      properties: { text: { type: 'string', minLength: 1, maxLength: 120 } },
    },
    response: {
      201: {
        type: 'object', required: ['message'],
        properties: { message: { type: 'string' } },
      },
    },
  },
  handler: async (request, reply) => reply.code(201).send({ message: request.body.text.trim() }),
});
```

## Prova la risposta

```bash
curl -i -X POST http://localhost:3278/api/messages \
  -H 'content-type: application/json' \
  -d '{"text":"Hello"}'
```

La risposta è HTTP 201 con `{"message":"Hello"}`. Un body senza `text`, una stringa vuota o un valore oltre 120 caratteri produce HTTP 400. Non affidarti soltanto ai tipi TypeScript per validare richieste esterne.

## Usa Fastify

L'handler riceve `request` e `reply` nativi: puoi leggere parametri e header o impostare lo stato. In `src/server/plugins.ts` registri plugin e hook condivisi. Il limite iniziale dei body è 1 MiB. Gli errori interni non espongono stack al client; le API inesistenti restituiscono JSON con HTTP 404.

Non importare moduli di `src/server` nei componenti Angular. Per condividere tipi usa un modulo senza dipendenze dal server e import di tipo quando possibile. Questa alpha non genera ancora un client API tipizzato per percorso.

Prosegui con [resolver e SSR](rendering.md). Approfondisci [validazione e serializzazione Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

## Opzioni native della rotta (prossima alpha)

Nel ramo main, `defineApiRoute()` accetta opzioni native Fastify come `preHandler`,
array di hook, `onSend`, `bodyLimit`, `config`, `exposeHeadRoute` e gestori di errore
per rotta. Questo esempio richiede la prossima alpha; non è incluso in npm
`0.1.0-alpha.1`.

```ts file=src/server/api/limited.post.ts
import { defineApiRoute } from '@fastang/core';

export default defineApiRoute<{ Body: { text: string } }>({
  bodyLimit: 64,
  schema: {
    body: {
      type: 'object', required: ['text'],
      properties: { text: { type: 'string' } },
    },
  },
  preHandler: async request => { request.body.text = request.body.text.trim(); },
  onSend: async (_request, reply, payload) => {
    reply.header('x-route-example', 'limited');
    return payload;
  },
  handler: async request => ({ message: request.body.text }),
});
```

`POST /api/limited` rimuove gli spazi dal body validato e aggiunge un header alla
risposta. Un body JSON oltre 64 byte restituisce HTTP 413. Ordine degli hook,
risposte anticipate, validazione ed errori restano quelli di Fastify. Gli hook
scritti con `function` mantengono il `this` di Fastify; le arrow function usano il
normale legame lessicale di JavaScript.

Metodo e URL derivano sempre dal nome del file e non sono opzioni configurabili.
`defineContractRoute()` accetta le stesse opzioni, inferendo i tipi anche negli
hook, ma prende lo schema dal contratto condiviso. Le risposte di errore devono
corrispondere agli stati dichiarati nel contratto. I tipi delle opzioni specifiche
di un plugin restano nella sua estensione dei tipi Fastify. Un secondo parametro
generico permette di descrivere un oggetto `config` personalizzato. Sono ammesse
rotte senza schema, come in Fastify; i tipi TypeScript non validano l’input.
