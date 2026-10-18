# Inizia con FastAng

Crea un progetto, avvia il server e prova una pagina Angular che legge un'API Fastify.

## Requisiti

Questa guida si riferisce a FastAng `0.1.0-alpha.1`. Usa Node `^22.22.3`, `^24.15.0` oppure `>=26.0.0`, con npm. Lo starter usa Angular `22.2.3`, Vite `8.3.4` e Fastify `^5.12.7`. Le API possono cambiare tra release alpha.

## Crea e avvia

```bash
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Apri `http://localhost:3278`. La porta 3278 corrisponde a FAST sulla tastiera telefonica. Il generatore crea una nuova cartella; rifiuta destinazioni già esistenti. `--install` esegue npm install. Senza questo flag devi eseguirlo nel progetto prima di avviarlo.

## Prova il progetto

| URL | Cosa verificare |
| --- | --- |
| `/` | Il contatore risponde dopo l'idratazione Angular. |
| `/greet/world` | Il resolver legge il saluto da Fastify. |
| `/api/health` | Risposta JSON con `ok: true`. |
| `/about` | Pagina prerenderizzata nella build di produzione. |
| `/missing` | Pagina non trovata con HTTP 404 sul server. |

In sviluppo anche `/about` viene renderizzata sul server a ogni richiesta. Il prerendering si applica alla build di produzione.

## Dove lavorare

- `src/app/pages`: pagine, layout e metadati del router.
- `src/server/api`: endpoint Fastify con il metodo nel nome del file.
- `src/server/plugins.ts`: plugin e hook del server.
- `fastang.config.ts`: URL di prerendering e opzioni Vercel.

## Controlla la produzione

```bash
npm run check
npm run build
npm start
```

Ferma il server di sviluppo prima di avviare la produzione sulla stessa porta. `npm run check` verifica i tipi e i template; non avvia un server.

Prosegui con [pagine e layout](routing.md), poi con [le API](api.md).
