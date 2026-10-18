# Riferimento API pubbliche e supporto

Questo riferimento descrive `0.1.0-alpha.4`. Tutte le API FastAng sono sperimentali:
un export rende un’API pubblica, non stabile tra release alpha. Per riprodurre
un progetto, fissa core e generatore a versioni corrispondenti.

## Punti di ingresso pubblici del pacchetto

| Import | Contesto | API |
| --- | --- | --- |
| `@fastang/core` | Node | `defineApiRoute`, configurazione, factory server, handler Node, listen e tipi SSR |
| `@fastang/core/api` | Node | `defineApiRoute`, `ApiRouteOptions` |
| `@fastang/core/config` | Configurazione | `defineConfig`, `validateConfig`, `validateVercelOptions` e tipi di configurazione |
| `@fastang/core/server` | Node | `createServer`, `createApiServer`, `staticFile` e tipi delle opzioni server/rendering |
| `@fastang/core/http-server` | Node | `createHttpServer`, `HttpServerOptions` |
| `@fastang/core/node-handler` | Node | `createNodeHandler` |
| `@fastang/core/listen` | Node | `listen`, `DEFAULT_PORT` |
| `@fastang/core/angular` | Angular SSR | `createRenderer` |
| `@fastang/core/render-context` | Tipi | `RenderContext`, `ApiDispatchOptions`, `ApiDispatchResult` |
| `@fastang/core/contracts` | Browser + SSR | `defineApiContract`, `apiUrl` e tipi inferiti del contratto |
| `@fastang/core/contract-route` | Node | `defineContractRoute` |
| `@fastang/core/http-client` | Angular browser + SSR | `createApiClient`, `injectApiClient`, `ApiRequestOptions` |
| `@fastang/core/redirect` | Browser + SSR | `normalizeRedirectLocation` |
| `@fastang/core/vite` | Build | `defineFastangConfig` |
| `@fastang/core/routes` | Tooling | Discovery, alberi di pagine, generazione, ispezione e tipi delle rotte |
| `@fastang/core/vite-plugin` | Tooling | `fastang`, `isServerModule` |
| `@fastang/core/adapters/vercel-plan` | Tooling | Pianificazione delle funzioni, pattern delle rotte e tipi del piano di deploy |
| `@fastang/core/adapters/vercel` | Tooling | `buildVercelOutput` |

Usa questi percorsi del pacchetto invece di importare `dist/`, `src/` o i moduli
interni dei comandi. Gli entry point di tooling espongono API vicine
all’implementazione e possono cambiare più facilmente. La presenza di un modulo
nel tarball non lo rende un percorso di import supportato separatamente.

L’import runtime della radice è riservato al server. Nel codice Angular usa
`/http-client` e `/contracts` quando opportuno. `/angular` configura il rendering
server, non il bootstrap del browser. Usa `import type` per i tipi server/rendering
consumati da Angular, così gli import vengono rimossi. Il controllo Vite rifiuta
gli import runtime server nei bundle browser, anche attraverso altri moduli.

## Matrice runtime e dipendenze

| Pacchetto | Versioni accettate |
| --- | --- |
| Node.js | `^22.22.3 / ^24.15.0 / >=26.0.0` |
| `@angular/common` | `22.2.3` |
| `@angular/compiler` | `22.2.3` |
| `@angular/core` | `22.2.3` |
| `@angular/platform-browser` | `22.2.3` |
| `@angular/platform-server` | `22.2.3` |
| `@angular/router` | `22.2.3` |
| `fastify` | `^5.12.7` |
| `rxjs` | `^7.8.2` |
| `tslib` | `^2.8.1` |
| `vite` | `8.3.4` |
| `typescript` | `~6.0.2` |
| `@angular/compiler-cli` | `22.2.3` |
| `@angular/build` | `22.2.3` |
| `@sinclair/typebox` | `^0.34.41` |

Le alternative Node.js nella prima riga sono separate da `/`. Questi sono gli
intervalli engine e peer del pacchetto, non una dichiarazione che ogni futura
versione compatibile sia stata verificata. Tutti i peer Angular sono fissati alla
stessa versione. TypeBox è un peer opzionale: installalo se usi contratti condivisi.
Gli altri peer sono richiesti dalla configurazione applicativa/tooling. Le dipendenze
runtime del core vengono installate con esso; la tabella non elenca tutte le
dipendenze transitive.

La CI esegue l’app in produzione su Linux con Node 22.22.3, 24.15.0 e la linea
Node 26. I test browser coprono Chromium, Firefox e WebKit, più le emulazioni
Pixel 7 Chromium e iPhone 13 WebKit. Verificano lo starter generato e l’esempio
di autenticazione; l’emulazione non è un test su dispositivo fisico. macOS,
Windows, Bun, Deno e altre versioni Node non hanno una copertura automatizzata
equivalente in questo repository.

## Ambito del deploy e del rendering

| Destinazione | Ambito attuale |
| --- | --- |
| Server Node | Server HTTP Fastify, SSR, API, URL pubblici di prerender espliciti, chiusura tramite segnali |
| Vercel | Build Output API v3, funzioni Node.js 24 condivise o per rotta, asset CDN e HTML prerenderizzato |
| Runtime Edge | Nessun adapter |
| Export solo statico | Nessun export completo dell’app senza server |
| ISR e revalidazione | Non implementate |
| Streaming HTML Angular | L’HTML completo viene prodotto prima dell’invio della risposta SSR |

Per impostazione predefinita le risposte SSR sono private e senza cache condivisa; l’HTML prerenderizzato è
pubblico. Gli URL concreti di prerender vengono elencati nella configurazione;
`/` e i namespace runtime restano riservati. In sviluppo le pagine sono renderizzate
su richiesta. La guida al [rendering](rendering.md) descrive dati e cache; quella
al [deploy](deployment.md) descrive l’output e la configurazione Vercel.

La CI verifica i pacchetti Node/Vercel e il sito della documentazione è pubblicato
su Vercel. Questo non garantisce compatibilità con ogni plugin o deployment:
addon nativi, file letti dinamicamente e servizi esterni richiedono verifiche
nell’app che li usa. L’esempio opzionale di sessione include un proprio passaggio
di packaging per l’addon nativo. L’uso di Vite o Angular non implica supporto Edge.

## Contratto della CLI

```sh
npx fastang --help
npx fastang generate
npx fastang routes --json
npx fastang dev
npm run build
npm run build:vercel
```

`generate` scrive i moduli Angular/API di registrazione delle rotte. `routes` legge
la mappa dei file senza eseguire moduli applicativi o scrivere file; `--json`
restituisce un documento con `schemaVersion: 1`. `dev` valida la configurazione,
avvia Vite/Fastify e riavvia il backend quando cambiano i file server/shared/config
osservati. La porta predefinita è 3278; `PORT` e `HOST` la modificano.

Gli script di build dello starter eseguono i controlli Angular/TypeScript prima
di chiamare `fastang build` o `fastang build --vercel`. Il comando CLI diretto non
sostituisce tali controlli. La configurazione viene validata prima di sostituire
`dist/`. Servono `fastang.config.ts` e i collegamenti applicativi forniti dallo
starter: non è una CLI applicabile direttamente a qualsiasi workspace Angular.

## Responsabilità e confini di compatibilità

FastAng gestisce discovery dei file, integrazione Angular/Fastify, dispatch HTTP
locale SSR e output degli adapter. Angular gestisce routing, DI, HttpClient e
idratazione. Fastify gestisce hook API, parsing, validazione, serializzazione e
plugin. I contratti tipizzati aggiungono tipi derivati dagli schemi, non un secondo
router o trasporto RPC. La [guida ai contratti](typed-api.md) descrive il loro
ambito JSON più ristretto.

Politica delle sessioni, identity provider, persistenza, autorizzazione, lavori in
background e stato distribuito appartengono all’applicazione o ai suoi servizi.
Le funzioni Vercel condivise e per rotta non condividono la memoria del processo.
Il [contratto HTTP SSR](https://github.com/daclab-dev/fastang/blob/main/docs/ssr-http.md#requests-and-sessions)
descrive credenziali, cookie e redirect.

## Controlli CLI delle route

`fastang check [--project <tsconfig>] [--json] [--strict]` verifica route e contratti senza eseguire l’applicazione. Vedi [API tipizzate](typed-api.md#controllo-statico-delle-route).
