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
