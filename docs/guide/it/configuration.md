# Configurazione, plugin e ambiente

Estendi il server con Fastify e mantieni separate le impostazioni pubbliche dai segreti del backend.


La validazione della configurazione è disponibile da `0.1.0-alpha.1`.

`defineConfig()` valida la configurazione a runtime. La build controlla anche gli export default semplici prima di sostituire `dist/`. Opzioni sconosciute, tipi non validi, percorsi riservati al runtime (`/`, `/api`, `/assets`, `/__fastang`) e destinazioni in conflitto come `/about` e `/about/` producono un errore esplicito. I percorsi di prerendering accettano solo lettere ASCII, cifre, underscore, trattini e slash; query string e frammenti non sono supportati.


Dalla versione `0.1.0-alpha.3`, anche `fastang dev` valida le configurazioni
esportate come semplici oggetti prima di caricare i plugin applicativi o aprire il
server. Una configurazione non valida ferma il server corrente; il supervisore
continua a osservare i file. Correggi e salva `fastang.config.ts` per riavviarlo
automaticamente. In sviluppo le pagine prerender vengono ancora renderizzate su
richiesta; l’HTML statico viene generato soltanto durante la build.

## Registra un hook

Sostituisci `src/server/plugins.ts` con questo file. L'hook aggiunge un header a ogni richiesta gestita da Fastify.

```ts file=src/server/plugins.ts
import type { FastifyInstance } from 'fastify';

export async function configureServer(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('x-app-name', process.env['APP_NAME'] ?? 'my-fastang-app');
  });
}
```

Questo punto di ingresso viene usato dal server Node e dalle funzioni API/SSR Vercel. I file serviti direttamente dal CDN Vercel non attraversano gli hook Fastify. In configurazione puoi anche usare `app.register()` per plugin compatibili con Fastify 5. Installa i plugin aggiuntivi nel tuo progetto: non sono inclusi automaticamente.

## Variabili del server

```bash
PORT=4000 HOST=127.0.0.1 APP_NAME=my-app npm run dev
```

La sintassi dell'esempio è per shell POSIX. Passa le variabili tramite la shell o la piattaforma di deploy. L'alpha non carica automaticamente i file `.env` nel processo Fastify. `PORT` deve essere una porta valida; la porta predefinita è 3278 e l'host predefinito è `127.0.0.1`.

Le variabili `VITE_` di Vite sono destinate al client e possono finire nel bundle del browser. Non usarle per segreti del server. Per API e plugin leggi le variabili server da `process.env`.

## I due file di configurazione

`fastang.config.ts` contiene gli URL espliciti di prerendering e le opzioni dell'adapter Vercel. `vite.config.ts` usa `defineFastangConfig()` da `@fastang/core/vite`: include il compilatore Angular, la generazione delle route e il confine server/client.

Non importare codice di `src/server`, file `.server.ts` o API runtime del server nei componenti del browser. Il controllo del bundle rifiuta questi import anche quando sono transitivi. I tipi condivisi devono vivere in moduli che non caricano dipendenze server.

Consulta [gli hook Fastify](https://fastify.dev/docs/latest/Reference/Hooks/) e [le variabili Vite](https://vite.dev/guide/env-and-mode). Continua con [il deploy](deployment.md).
