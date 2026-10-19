# FastAng

Un progetto [DacLab](https://github.com/daclab-dev), creato da Dario Chiapperini.

[English overview](README.md) · [Contribuire](CONTRIBUTING.md) · [Licenze e asset](NOTICE.md)

Angular nativo, Fastify completo. Una prima base funzionante per un meta-framework fullstack orientato al runtime Node.js.

**Stato: prototipo 0.1.** Il workspace include il pacchetto `@fastang/core`, uno starter minimo indipendente e il sito dimostrativo. Il pacchetto espone la CLI `fastang`, ed è disponibile su npm insieme a `create-fastang`, con il tag `alpha`. Non sono dichiarati vantaggi prestazionali rispetto ad Analog senza benchmark comparabili.

Creazione e aggiornamenti usano il pacchetto separato `@fastang/cli`: installalo con `npm install -g @fastang/cli@alpha`. I comandi del core locale gestiscono sviluppo e build. Vedi la [guida CLI](docs/cli.md).

## Avvio

Richiede una versione Node supportata da Angular 22: **22.22.3+ nella linea 22, 24.15+ nella linea 24, oppure 26+**. Le dipendenze sono bloccate nel `package-lock.json`.

```bash
npm ci
npm run dev
```

Apri <http://localhost:3278>. **3278 = FAST** sul tastierino telefonico: è la porta predefinita di FastAng, sia in sviluppo sia con `npm start`. `HOST` e `PORT` sono configurabili; l'host predefinito è `127.0.0.1`. Per esempio: `PORT=4000 npm run dev`.

```bash
npm run check             # TypeScript + template Angular con controlli strict
npm test                  # Test di routing, API, confini del client e runtime
npm run build             # Build client + server e prerendering
npm run test:production   # Test sul bundle appena costruito
npm start                 # Server di produzione, senza Vite
```

In sviluppo Vite gestisce compilazione e aggiornamenti del frontend. La struttura delle pagine viene rigenerata all'aggiunta/rimozione di file. Le modifiche a backend, contratti condivisi e configurazione riavviano il server.

## Demo

| URL | Comportamento |
| --- | --- |
| `/` | SSR + hydration, contatore interattivo |
| `/about` | Prerendering in produzione, SSR in sviluppo |
| `/products/starter` | Due layout annidati, resolver Angular, API e HTTP transfer cache |
| `/products/workshop` | Cambio prodotto mantenendo layout e provider della sezione |
| `/products/starter?preview=blocked` | Guard dimostrativa che naviga a `/catalog-access` prima del resolver |
| `/products/missing` | Pagina prodotto con stato HTTP 404 |
| `/request` | Dato isolato per richiesta, trasferito al browser |
| `/api/health` | Endpoint Fastify con schema di risposta |
| `/api/products/:id` | Parametri validati, risposta serializzata, 404 per prodotto assente |
| `/api/context` | Etichetta dimostrativa della richiesta |

```bash
curl -i http://localhost:3278/api/products/starter
curl -i http://localhost:3278/api/products/INVALID!
curl -H 'x-request-label: Ada' http://localhost:3278/request
```

L'header `x-request-label` serve esclusivamente a dimostrare l'isolamento: non è un'identità autenticata. Nessuna autenticazione è implementata.

## Struttura

```text
packages/core/src/            Runtime, renderer Angular, CLI e adapter
examples/starter/             Applicazione minima indipendente
  api.ts                      Registrazione tipizzata delle API Fastify
  routes.ts                   Discovery, precedenze e collisioni
  server.ts                   Factory Fastify e bridge API per SSR
  vite-plugin.ts              Rigenerazione route e confine server/client
scripts/                      Asset e verifiche di integrazione
src/
  app/
    pages/                    Componenti di pagina Angular
    app.ts                    Layout globale e router-outlet
    app.config.ts             Factory dei provider, nuova per ogni rendering
    fastang.routes.ts         Generato, non da modificare
  server/
    api/                      Endpoint, separati dal frontend
    plugins.ts                Punto di estensione Fastify
    products.ts               Catalogo dimostrativo in memoria
    index.ts                  Factory del server di produzione
    start.ts                  Entrypoint Node eseguibile
  shared/                     Schemi, tipi e contratto del contesto SSR
  main.ts                     Bootstrap browser
  main.server.ts              Rendering Angular e backend HTTP locale
.fastang/api.ts               Manifest API generato
fastang.config.ts             URL da prerenderizzare
vite.config.ts                Compilazione Angular e Vite
```

Gli output generati sono ignorati da Git e ricreati dai comandi. Per aggiornare manualmente le route nell'editor: `npm run generate`.

## Aggiungere una pagina

Ogni `*.page.ts` in `src/app/pages` esporta come default un componente standalone Angular:

```ts
import { Component } from '@angular/core';

@Component({ template: '<h1>Contatti</h1>' })
export default class ContactPage {}
```

Salvato come `contact.page.ts`, diventa `/contact`. FastAng genera `Routes` standard con `loadComponent`; i componenti di pagina sono caricati in modo lazy.

| File | Path Angular |
| --- | --- |
| `index.page.ts` | `''` |
| `products/[id].page.ts` | `products/:id` |
| `products.[id].page.ts` | `products/:id` (alternativa, non insieme alla precedente) |
| `docs/[...slug].page.ts` | `docs/**` |
| `(public)/about.page.ts` | `about` |

Le cartelle tra parentesi sono gruppi senza segmento URL. Le route statiche precedono quelle parametriche; i catch-all vengono per ultimi. Le collisioni, anche tra parametri con nomi diversi, bloccano la generazione. I file/cartelle che iniziano con `_` o `.` sono ignorati. Non usare punti nei segmenti statici: sono separatori di percorso.

Il layout globale dell'applicazione resta un normale componente Angular (`src/app/app.ts`). I layout da filesystem si definiscono con `layout.ts` nella directory delle pagine: il default export è un componente standalone con `RouterOutlet`.

```text
pages/
  layout.ts                        # Layout opzionale di tutte le pagine
  index.page.ts
  products/
    layout.ts                      # Layout della sezione /products
    layout.route.ts                # Provider/metadati della sezione
    (details)/
      layout.ts                    # Secondo layout, senza segmento URL
      [id].page.ts                 # /products/:id
      [id].route.ts                # Guard, resolver e titolo della pagina
```

La gerarchia segue le directory fisiche: un file `products.[id].page.ts` nella root non eredita il layout nella cartella `products/`. Il layout deve contenere `<router-outlet />` per mostrare i figli. I componenti di pagina e layout sono lazy; un layout resta attivo durante la navigazione tra i propri figli.

La generazione rileva anche gli ordini ambigui: per esempio, un catch-all dentro un layout pathless può oscurare una pagina statica in un ramo fratello. In questi casi la build fallisce con i file coinvolti; sposta il layout su un antenato comune o separa i percorsi. I layout senza pagine discendenti vengono ignorati, i layout sotto un catch-all vengono rifiutati e `layout.page.ts` è un nome riservato. I parametri catch-all nominati non sono ancora implementati; si usa il normale wildcard Angular.

### Metadati, guard e resolver

Un file `nome.route.ts` accanto a `nome.page.ts` esporta i metadati standard Angular; `layout.route.ts` configura il layout della stessa directory. I file di metadati vengono importati prima della navigazione, senza caricare i componenti di pagina.

```ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { RouteMetadata } from '../../../shared/routing';
import type { Product } from '../../../shared/contracts';

export default {
  title: 'Prodotto | FastAng',
  resolve: {
    product: (route) => inject(HttpClient).get<Product>(
      `/api/products/${encodeURIComponent(route.paramMap.get('id') ?? '')}`,
    ),
  },
} satisfies RouteMetadata;
```

Nell'esempio `products/[id].page.ts`, il componente può dichiarare `product = input.required<Product>()`: `withComponentInputBinding()` collega il risultato del resolver all'input. Sono supportati `title`, `data`, `resolve`, `providers`, `runGuardsAndResolvers`, `canActivate`, `canActivateChild`, `canDeactivate` e `canMatch`. Percorso, componente e figli vengono generati dal filesystem. Un file `.route.ts` senza pagina o layout corrispondente causa un errore.

Le guard e i resolver usano il contesto DI nativo Angular, incluso quello dei provider di rotta. `createRoutes()` genera oggetti nuovi per ogni applicazione SSR: gli injector e i componenti lazy memorizzati da Angular non passano da una richiesta all'altra. Per stato mutabile nei provider usa `useFactory`, non oggetti condivisi con `useValue`.

La demo del catalogo mostra un contatore di layout che rimane invariato durante il cambio prodotto e un provider con il numero di risoluzioni. Ogni richiesta SSR riparte da una risoluzione; nel browser il numero cresce navigando tra i prodotti. La guard `preview=blocked` restituisce un `UrlTree` prima del resolver. È una dimostrazione, non un controllo di autenticazione. Durante SSR il runtime osserva la destinazione finale del router e restituisce HTTP **302** con `Location` e corpo vuoto. Nel browser la guard continua a usare la normale navigazione Angular. La query `ref`, se presente nella demo, viene conservata e codificata nella destinazione.

## Aggiungere una API

Il nome del file specifica il metodo: `src/server/api/hello.get.ts` diventa `GET /api/hello`.

```ts
import { Type, type Static } from '@sinclair/typebox';
import { defineApiRoute } from '@fastang/core/api';

const ResponseSchema = Type.Object({ message: Type.String() });
type Response = Static<typeof ResponseSchema>;

export default defineApiRoute<{ Reply: Response }>({
  schema: { response: { 200: ResponseSchema } },
  handler: async () => ({ message: 'Ciao da Fastify' }),
});
```

Sono disponibili `get`, `post`, `put`, `patch`, `delete`, `head`, `options`. I file senza suffisso metodo restano helper e non vengono registrati. I tipi di handler sono quelli Fastify; gli schemi validano le richieste e definiscono la serializzazione. Questo prototipo condivide i contratti TypeScript ma non genera ancora un client API tipizzato per percorso.

Registra hook, decorator e plugin dell'applicazione in `src/server/plugins.ts`. Il runtime espone anche `createServer({ configure, ... })` per integrazioni e test. Rispetta l'encapsulation standard di Fastify quando registri i tuoi plugin.

## Redirect HTTP durante SSR

Un `UrlTree` restituito da una guard o una navigazione del router verso una destinazione diversa dall'URL richiesto diventano un redirect HTTP 302:

```bash
curl -i 'http://localhost:3278/products/starter?preview=blocked&ref=launch'
# HTTP/1.1 302 Found
# location: /catalog-access?ref=launch
# cache-control: private, no-store
# x-fastang-render: redirect
```

La destinazione è un percorso locale assoluto (inizia con `/`), con eventuale query string e fragment. Il runtime rifiuta URL esterne, destinazioni protocol-relative (`//host`), backslash e caratteri di controllo; normalizza Unicode prima di scrivere l'header. L'header `Host` della richiesta non può trasformare la destinazione in un URL esterno. Query equivalenti con codifiche diverse (`+` e `%20`) non generano da sole un redirect.

I redirect SSR hanno corpo vuoto e `Cache-Control: private, no-store`, anche per `HEAD`. Il router viene comunque eseguito fino alla destinazione finale prima di rispondere: questo prototipo non interrompe anticipatamente il bootstrap Angular. Il resolver della rotta rifiutata dalla guard non viene eseguito; eventuali resolver della destinazione possono essere eseguiti.

Il contratto del renderer `RenderContext.redirect` permette a renderer personalizzati di specificare `location` e uno stato tra 301, 302, 303, 307 e 308; il bridge automatico Angular usa 302. Le route da prerenderizzare devono restituire 200: una destinazione che produce un redirect interrompe la build, evitando di salvare HTML sotto un URL sbagliato. I redirect delle API restano gestiti da Fastify e non vengono propagati automaticamente alla risposta HTML.

## SSR, dati e hydration

Il rendering usa le API pubbliche `renderApplication` e `provideServerRendering` di `@angular/platform-server`, con il bootstrap context previsto da Angular 22. Questa prima pipeline Vite non utilizza `AngularNodeAppEngine` o il builder Angular CLI.

Il client usa `provideClientHydration` con event replay e `HttpClient`. Durante SSR, un backend HTTP locale inoltra `/api/*` a `Fastify.inject()`, senza aprire una connessione loopback. Il bridge supporta le normali risposte JSON/testo; streaming, upload binari/multipart, cancellazione e progress degli eventi HTTP sono fuori dallo scope attuale. Le richieste esterne passano al backend fetch Angular.

Il backend locale viene eseguito dopo gli interceptor, così la transfer cache nativa può serializzare le risposte ammesse da Angular. Nessun accesso manuale al tag di stato. I provider con stato mutabile sono ricreati a ogni render, e header in ingresso selezionati (`cookie`, `authorization`, `x-request-label`) vengono inoltrati alle API interne. Per dati riservati configura esplicitamente la transfer cache nell'applicazione e trasferisci solo ciò che deve arrivare al browser.

Le risposte SSR hanno `Cache-Control: private, no-store`; non esiste una cache HTML condivisa. Il contesto applicativo usa il token pubblico `REQUEST_CONTEXT`. Le pagine demo possono impostare lo stato HTTP tramite tale contesto. Il bridge non propaga automaticamente `Set-Cookie` o redirect dalle chiamate API alla risposta HTML: queste integrazioni richiedono un contratto dedicato.

Un plugin blocca l'importazione nel bundle browser di moduli sotto `src/server`, `framework`, `.fastang` e dei file `*.server.ts`. Gli import di soli tipi vengono eliminati. Questo confine non sostituisce la corretta gestione dei segreti nei moduli condivisi.

## Prerendering e deploy

In `fastang.config.ts`:

```ts
export default defineConfig({
  prerender: ['/about', '/products/starter'],
});
```

Elenca URL concreti e pubblici, con segmenti alfanumerici, `_` o `-`. Query string e altri percorsi vengono rifiutati; `/`, `/api/*` e `/assets/*` sono riservati nella pipeline attuale. La root resta il template SSR. Una risposta diversa da 200 interrompe la build.

Gli HTML generati finiscono in `dist/client/<path>/index.html`; il manifest è `dist/prerender.json`. In produzione Fastify serve questi file saltando il rendering Angular, e aggiunge `X-Fastang-Render: prerender`. Le altre pagine hanno `X-Fastang-Render: ssr`. Gli asset con hash ricevono cache immutabile; un asset o una API inesistente restituisce 404, senza fallback HTML.

Il deploy richiede `dist/`, `package.json`, `package-lock.json` e le dipendenze runtime (`npm ci --omit=dev`). Puoi avviare il server da un'altra directory: i file sono risolti rispetto al bundle. Non servono Vite né i sorgenti a runtime. `SIGINT` e `SIGTERM` chiudono il server e, in sviluppo, Vite. È disponibile un adapter Vercel per funzioni Node.js; non sono ancora implementati un runtime Edge o un export statico completo senza server.

## Adapter Vercel

```bash
npm run build:vercel       # Build applicazione + .vercel/output (Build Output API v3)
npm run test:vercel        # Verifica anche i pacchetti copiati fuori dal repository
npm run test:production    # Verifica il runtime Node della stessa build
```

`vercel.json` imposta `npm run build:vercel` come build command con preset Other. Le funzioni usano **Node.js 24**; seleziona la stessa versione per il build nell'ambiente Vercel. Il deployment può essere generato dal repository oppure tramite il normale flusso CLI `vercel build` / `vercel deploy --prebuilt`, dopo aver collegato il progetto Vercel. Nessun deployment viene eseguito dagli script FastAng.

L'adapter in `packages/core/src/adapters/vercel.ts` genera:

- `static/assets/`: asset con hash sulla CDN, cache immutabile;
- `static/<path>/index.html`: pagine prerenderizzate, servite direttamente agli URL configurati (incluse le versioni inglesi);
- `functions/__fastang/api.func/`: fallback API Fastify, senza renderer Angular;
- `functions/__fastang/ssr.func/`: fallback SSR Angular, con API locali via `Fastify.inject()`;
- `config.json`: routing CDN / API / SSR e header di risposta.

Il template client della root resta privato nella funzione SSR: non viene pubblicato come `static/index.html`, che scavalcherebbe il rendering. Le dipendenze runtime sono tracciate con `@vercel/nft` e copiate dentro ogni funzione, senza dipendere dai `node_modules` del repository. Il build Node standard rimane disponibile con `npm run build`.

L'handler riceve `IncomingMessage` e `ServerResponse` nativi, attende `Fastify.ready()` e inoltra la richiesta al server senza chiamare `listen()`. Riusa un'istanza per ogni funzione calda e lascia a Fastify body parsing, limiti, cookie, hook e serializzazione. Il body non viene preventivamente elaborato dagli helper Vercel. Le risposte SSR restano private e senza cache condivisa; il rendering Angular attuale produce l'HTML completo, anche se il trasporto Node supporta lo streaming. Le variabili d'ambiente vanno configurate nel progetto Vercel e non sono incorporate dall'adapter.

La suddivisione è configurabile in `fastang.config.ts`:

```ts
vercel: {
  functions: 'routes',             // 'shared' per due sole funzioni aggregate
  pagePrefixes: ['', '/en'],        // prefissi pubblici aggiunti dal router dell'app
  prunePages: true,                // default: bundle SSR con i soli componenti necessari
},
```

In modalità `routes`, attiva in questa demo, il build aggiunge `functions/__fastang/pages/<id>.func/` per ogni pagina SSR del filesystem e `functions/__fastang/endpoints/<id>.func/` per ogni forma di percorso API. I metodi HTTP dello stesso percorso condividono una funzione (incluso HEAD); i nomi dei parametri possono differire tra metodi. Le versioni italiana e inglese di una pagina condividono la stessa funzione. Una pagina interamente prerenderizzata non genera una funzione dedicata. Il risultato attuale è di **12 funzioni**: 7 pagine, 3 endpoint e 2 fallback. Il manifest leggibile è `dist/vercel-manifest.json` e non viene pubblicato sulla CDN.

Le funzioni della modalità per rotta sono sotto il prefisso interno riservato `/__fastang`, così non oscurano pagine pubbliche come `/ssr` o endpoint come `/api`. I pattern specifici precedono quelli dinamici. I catch-all, le route definite manualmente nel router Angular e le API registrate dai plugin restano raggiungibili tramite i fallback. `pagePrefixes` è esplicito perché l'adapter non esegue né interpreta configurazioni Angular arbitrarie: deve riflettere i prefissi pubblici aggiunti dall'app. Prefissi riservati e alias equivalenti di pagine diverse vengono rifiutati.

Ogni funzione API dedicata registra soltanto i moduli del proprio percorso, oltre ai plugin comuni; le altre API del filesystem non vengono incluse dal relativo entrypoint. Ogni funzione SSR viene compilata separatamente: include il componente della pagina, i suoi layout antenati e i componenti 404. Le altre pagine e i loro layout non entrano nel grafo del bundle. Il router mantiene percorsi, metadati, provider, guard e resolver di tutte le rotte; le destinazioni di redirect usano un componente server minimale, senza caricarne il template. I redirect HTTP continuano quindi a risolversi e il client mantiene il router completo per hydration e navigazioni successive. Il bridge alle API locali resta disponibile. I file delle funzioni sono pacchetti autonomi, non symlink verso un'unica funzione.

L'ottimizzazione è attiva per default in modalità per rotta. Con `prunePages: false` si mantengono funzioni distinte con il grafo completo dei componenti: è una via di compatibilità per applicazioni che dipendono dal rendering dei componenti delle destinazioni prima di un redirect. I metadati che importano esplicitamente altri componenti li mantengono nel bundle; l'adapter non elimina tali dipendenze dichiarate dall'applicazione. Le rotte manuali fuori dal manifest non vengono riscritte.

Il valore predefinito del framework è `functions: 'shared'`, con due funzioni aggregate. È utile quando si preferisce limitare il numero di funzioni; la modalità per rotta va dimensionata rispetto ai limiti del proprio progetto Vercel. I plugin comuni vengono inizializzati in ogni funzione: non devono richiedere che tutte le altre API del filesystem siano registrate nella medesima istanza.

L'adapter riprende la separazione fra pagine statiche, SSR e API del Pages Router. ISR, revalidazione su richiesta, image optimization e runtime Edge non sono implementati. Le funzioni hanno istanze e memoria separate: eventuale stato condiviso deve vivere in un servizio esterno. Plugin con risorse native o file caricati dinamicamente vanno verificati nel proprio deployment; non sono garantiti dalla sola analisi degli import.

Le build server sono minificate, sia per Node sia per Vercel. Il report generato `dist/vercel-bundle-report.json` misura file tracciati, byte delle dipendenze tracciate, JavaScript server emesso e chunk di pagine/layout per ogni funzione. I dati sono byte non compressi; non sono misure di cold start o di latenza. In questa demo i chunk di pagine/layout delle funzioni dedicate sono circa il 72–92% più piccoli di quelli del fallback della stessa build. Le librerie comuni restano nel pacchetto, quindi questa percentuale non rappresenta la riduzione dell'intera funzione.

I test verificano il formato dell'output e invocano gli handler realmente impacchettati, fuori dal repository, per SSR bilingue, API, validazione, 404, redirect, HEAD, isolamento concorrente e invocazioni delle funzioni dedicate con registrazioni API separate. Non sostituiscono un primo deploy Preview sulla piattaforma Vercel.

Riferimenti del contratto: [Build Output API](https://vercel.com/docs/build-output-api), [primitivi delle funzioni](https://vercel.com/docs/build-output-api/primitives), [routing](https://vercel.com/docs/build-output-api/configuration), [Fastify serverless](https://fastify.dev/docs/latest/Guides/Serverless/).

## Verifiche e prossimi passi

I test coprono collisioni e precedenze, layout annidati e pathless, metadati orfani, rimozione delle route, import transitivi server nel client, validazione API, bridge JSON, errori, contesti concorrenti, SSR reale, stato HTTP, transfer cache su richieste successive, escaping dei dati e file prerenderizzati. Sul bundle reale verificano anche titoli, resolver, guard eseguite prima delle API, redirect HTTP con query codificate e isolamento dei provider di rotta su richieste sequenziali e concorrenti. Il runtime è verificato anche contro redirect esterni, header injection e stati non validi. La suite browser automatizzata esegue 30 verifiche sullo starter generato in produzione, con Chromium, Firefox e WebKit e profili mobile simulati. Si avvia con `npm run test:e2e`.

Le prossime estensioni sono configurazione delle modalità di rendering, client API derivato dai contratti, autenticazione con test dedicati e benchmark riproducibili contro Angular SSR e Analog. Il compilatore Vite è quello di `@analogjs/vite-plugin-angular`; FastAng implementa il proprio runtime Fastify e la propria pipeline.

## Brand

L'identità visiva nasce dal logo originale `fastang.jpeg`, che resta invariato. La demo usa blu notte, ciano, arancio e viola, con font Space Grotesk e Inter serviti localmente. Lo scudo trasparente è una variante derivata con ImageGen.

Apri `/brand` per vedere logo, palette, tipografia e regole d'uso. La [guida di brand](docs/brand/README.md) documenta asset, token, voce e provenienza della variante. Gli asset sono in `src/assets/brand/` e vengono distribuiti dal build Vite.

## L'autore

La pagina `/author`, collegata dal footer, presenta Dario Chiapperini e le motivazioni di FastAng. La biografia e i contatti provengono dal [sito personale](https://www.dariochiapperini.dev/); il racconto del progetto riflette le motivazioni condivise dall'autore. La foto è inclusa localmente in formato WebP, con l'originale conservato in `src/assets/author/` e un export riproducibile tramite `npm run author:assets`.

## Riferimenti

- [Angular SSR](https://angular.dev/guide/ssr)
- [renderApplication](https://angular.dev/api/platform-server/renderApplication)
- [Fastify](https://fastify.dev/docs/latest/)
- [Plugin Angular per Vite di Analog](https://analogjs.org/docs/packages/vite-plugin-angular/overview)

## Lingue del sito

Il sito dimostrativo è disponibile in italiano sugli URL originali (`/`, `/author`, ecc.) e in inglese sotto `/en` (`/en`, `/en/author`, ecc.). Il selettore IT/EN mantiene percorso, query e frammento; i link interni e i redirect della demo catalogo rispettano la lingua corrente. Non sono usati cookie o redirect basati sulla lingua del browser.

Le traduzioni del sito sono in `src/app/i18n/en.ts`, con il testo italiano come chiave. Le pipe `t` e `localePath` condividono un servizio Angular per applicazione, isolato tra richieste SSR. Questa è una scelta del sito demo, non una convenzione obbligatoria del framework. Gli endpoint API mantengono il loro contratto; le descrizioni demo vengono tradotte nel livello di presentazione.

`LocalizedTitleStrategy` aggiorna titoli, descrizione, `html[lang]`, canonical e alternate `hreflang` anche nelle navigazioni client. L'origine pubblica prevista è `https://fastang.dev` (`SITE_ORIGIN`): aggiornarla se cambia il dominio. `/about` e `/en/about` vengono prerenderizzate nella stessa build.

Per preparare una pubblicazione: `npm ci`, `npm run build`, `npm run test:production`, poi `npm start` su un runtime Node compatibile con `package.json`. Il collegamento del dominio, HTTPS e l'hosting vanno configurati nell'ambiente di destinazione.

## Pacchetto e starter indipendente

`npm ci` compila automaticamente `@fastang/core`. Dopo modifiche ai sorgenti del pacchetto esegui `npm run core:build`. Il sito e `examples/starter` usano lo stesso runtime: il framework riceve le API attraverso `registerApi(app)` e non importa file dell'applicazione.

La [guida dello starter](examples/starter/README.md) spiega come installarlo nel workspace oppure copiarlo altrove e installare il tarball prodotto da `npm pack --workspace @fastang/core --pack-destination /tmp`. La prima release è disponibile sul registry npm con il tag `alpha`.

`npm run test:starter` installa il tarball in una cartella temporanea fuori dal repository e verifica tipi, build, SSR, API, prerendering, 404, sviluppo con riavvio del backend e una funzione Vercel.

## Generare un progetto

`create-fastang` crea un'applicazione indipendente usando lo starter come unica sorgente. Per usare la release pubblica dal registry:

```sh
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Per provare modifiche locali prima di una nuova release:

```sh
npm pack --workspace @fastang/core --pack-destination /tmp
npm run create -- /tmp/my-fastang-app --core-package /tmp/fastang-core-0.1.0-alpha.6.tgz
cd /tmp/my-fastang-app
npm install
npm run dev
```

La destinazione deve essere una cartella nuova: il generatore rifiuta file, cartelle e link già esistenti. `--name` imposta il nome npm; `--install` installa subito le dipendenze, mentre il comportamento predefinito genera soltanto i file. Il tarball locale del core deve restare disponibile per le installazioni successive.

La [guida del generatore](packages/create-fastang/README.md) descrive anche l'uso del pacchetto installato fuori dal repository. `npm run test:starter` verifica ora l'intero percorso: tarball del core e del generatore, creazione dell'app, installazione, build e server.

## Preparazione della release alpha

`npm run release:check` esegue i controlli completi e prepara tarball verificati, con integrità SHA-512 e commit di origine. La [guida di pubblicazione](docs/releases.md) descrive ordine di pubblicazione, tag `alpha` e verifica dal registry. La versione corrente è `0.1.0-alpha.6`.

## Guide pratiche

Le guide in [italiano](docs/guide/it/getting-started.md) e [inglese](docs/guide/en/getting-started.md) sono pubblicate anche su `/docs` e `/en/docs`. Coprono avvio, routing, API, rendering, errori, plugin e deploy. Il sito legge gli stessi Markdown del repository.

`npm run test:docs` applica i file TypeScript degli esempi a copie dello starter, compila i template ed esegue le verifiche HTTP descritte nelle guide. Gli esempi delle due lingue devono rimanere identici.

## Esempio opzionale di autenticazione

Da un checkout del repository, `npm run create:auth -- /percorso/nuova-app` genera un'app separata con login, pagina SSR protetta e logout tramite i plugin ufficiali Fastify per sessione e limitazione dei tentativi. Il comando crea segreti casuali in un `.env` locale escluso da Git. L'esempio usa un solo account dimostrativo: la [guida dedicata](examples/auth/README.md) spiega avvio, packaging Vercel e limiti delle sessioni stateless. `npm run test:auth` esegue i controlli browser e sulle funzioni impacchettate. Il core e lo starter minimo pubblicato restano indipendenti dall'autenticazione.

## Contratti API tipizzati

Dalla versione `0.1.0-alpha.3` è disponibile l'integrazione opzionale con TypeBox: un contratto condiviso definisce gli schemi e permette di inferire parametri e risposte degli handler Fastify e delle chiamate Angular. L'[esempio greeting](examples/typed-api/README.md) descrive utilizzo e limiti. La validazione resta a Fastify, le richieste passano da HttpClient e il routing deriva ancora dai file.

## Misure delle prestazioni

`npm run benchmark` compila una copia isolata dello starter in produzione e misura dimensioni della build, avvio in processi nuovi e latenza HTTP per SSR, prerender e API. I report JSON conservano campioni e informazioni sull’ambiente. La [guida alle misure](docs/benchmarks.md) spiega condizioni e limiti; `-- --smoke` verifica il funzionamento con pochi campioni.

## API pubbliche e ambienti supportati

Il [riferimento](docs/guide/it/reference.md) elenca gli entry point npm pubblici, i confini degli import browser/server, le versioni dichiarate delle dipendenze, la copertura automatizzata e i limiti attuali del deploy.

## Aggiornamenti e documentazione versionata

Aggiorna la dipendenza `@fastang/core` nell’app esistente e allinea i peer richiesti; non ricreare il progetto con il generatore. La [guida agli aggiornamenti](docs/guide/it/upgrading.md) descrive verifiche e migrazioni manuali. Prima della v1 il selettore espone solo le guide correnti; i sorgenti delle alpha precedenti restano nei tag Git. Gli archivi della documentazione partiranno dalla v1.
