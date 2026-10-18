# Deploy Node e Vercel

Usa lo stesso progetto per un server Node persistente o per le funzioni Vercel.

## Server Node

```bash
npm ci
npm run build
HOST=0.0.0.0 PORT=3278 npm start
```

Esegui `npm ci` quando il progetto ha già un `package-lock.json`; il generatore con `--install` lo crea. Altrimenti esegui prima `npm install` e conserva il lockfile nel repository.

Il processo usa il runtime Node supportato dalla versione alpha. Conserva la struttura completa di `dist/server`, `dist/client` e `dist/prerender.json`, insieme alle dipendenze runtime installate; non copiare soltanto `index.js`. Il server serve gli asset e gli URL prerenderizzati dalla directory client.

`HOST=0.0.0.0` rende il processo raggiungibile sulle interfacce della macchina, utile dietro un reverse proxy o in un container. Configura TLS, dominio e riavvii del processo nella piattaforma di hosting. Con `SIGTERM` il server chiude Fastify.

## Vercel

Lo starter include `vercel.json`. Importa il repository su Vercel e usa queste impostazioni.

| Impostazione | Valore |
| --- | --- |
| Framework preset | Other |
| Build command | `npm run build:vercel` |
| Output directory | Nessun override |
| Node del progetto | 24.x |

Per verificare l'output prima del deploy:

```bash
npm run build:vercel
```

Il comando genera `.vercel/output` nel formato Build Output API. Non caricare i suoi file nella root pubblica del sito e non impostare `dist/client` come output: il template della root deve restare privato al renderer SSR.

## Rendering e funzioni

Lo starter usa `vercel: { functions: 'routes' }`: l'adapter crea funzioni dedicate per pagine ed endpoint, più i fallback. I file statici e le pagine prerenderizzate vengono serviti dal CDN. Le funzioni riusano l'inizializzazione di Fastify tra invocazioni calde, senza avviare un listener TCP.

Le variabili server si configurano in Vercel e richiedono un nuovo deploy per essere applicate. Non usare variabili client `VITE_` per segreti. Non ci sono ISR o cache HTML SSR condivise in questa alpha.

## Verifica il risultato

Controlla `/`, `/greet/world`, `/api/health`, `/about` e un URL inesistente. Prova anche il contatore e la navigazione nel browser. Un risultato verde della build non sostituisce questa verifica del deployment reale.

Torna a [configurazione e ambiente](configuration.md) per plugin e variabili del server.
