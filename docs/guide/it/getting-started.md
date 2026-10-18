# Inizia con FastAng

Crea un progetto, avvia il server e prova una pagina Angular che legge un'API Fastify.

## Requisiti

Questa guida si riferisce a FastAng `0.1.0-alpha.5`. Usa Node `^22.22.3`, `^24.15.0` oppure `>=26.0.0`, con npm o pnpm 10/11. Lo starter usa Angular `22.2.3`, Vite `8.3.4` e Fastify `^5.12.7`. Le API possono cambiare tra release alpha.

## Crea e avvia

```bash
npm create fastang@alpha my-app -- --install
cd my-app
npm run dev
```

Apri `http://localhost:3278`. La porta 3278 corrisponde a FAST sulla tastiera telefonica. Il generatore crea una nuova cartella; rifiuta destinazioni già esistenti. `--install` installa le dipendenze con npm. Senza questo flag devi eseguirlo nel progetto prima di avviarlo.

## Supporto pnpm

Con pnpm 10 o 11 puoi creare il progetto e installare le dipendenze con un solo comando:

```sh
pnpm create fastang@alpha my-app --install
cd my-app
pnpm run dev
```

Apri `http://localhost:3278`. FastAng riconosce pnpm e lo usa per installare le
dipendenze e preparare gli script del progetto. L’installazione crea
`pnpm-lock.yaml`: aggiungilo al repository insieme a `package.json` per mantenere
le stesse versioni delle dipendenze sui diversi computer.

Se preferisci installare le dipendenze in un secondo momento, usa
`--no-install` al posto di `--install`, poi esegui `pnpm install` nella cartella
del progetto.

Quando avvii il generatore tramite un altro gestore, puoi scegliere pnpm
esplicitamente aggiungendo `--package-manager pnpm`.

### Comandi del progetto

Esegui questi comandi dalla cartella dell’app:

| Comando | A cosa serve |
| --- | --- |
| `pnpm run dev` | Avvia il server di sviluppo con aggiornamento delle pagine. |
| `pnpm run check` | Controlla route, tipi TypeScript e template Angular. |
| `pnpm run build` | Crea la build di produzione dopo i controlli. |
| `pnpm start` | Avvia il server dalla build di produzione. |
| `pnpm run build:vercel` | Prepara la build da pubblicare su Vercel. |

Per aggiornare un’app già esistente, segui [la procedura per pnpm](upgrading.md#aggiornamenti-pnpm).

### Script di installazione bloccati

Se pnpm segnala script bloccati, ad esempio con il messaggio
`Ignored build scripts`, esegui:

```sh
pnpm approve-builds
pnpm install
```

Nel primo comando seleziona le dipendenze di cui vuoi autorizzare gli script.
Poi ripeti l’installazione. Le autorizzazioni del progetto sono conservate in
`pnpm-workspace.yaml`.

## CLI dedicata

Per usare direttamente `fastang new`, installa globalmente la CLI leggera:

```sh
npm install -g @fastang/cli@alpha
fastang new another-app --install
```

Per creare un progetto con pnpm dalla CLI globale, usa
`fastang new another-app --package-manager pnpm --install`.

Senza installazione globale puoi eseguire
`npx --package=@fastang/cli@alpha fastang-cli new another-app --install`.
La CLI usa il generatore della stessa release. Sviluppo e build usano il core
installato nell’app. Per i progetti esistenti leggi [aggiornamento](./upgrading.md).

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

## Usare FastAng con un assistente AI

Fornisci al tuo assistente il link a [llms.txt](https://fastang.dev/llms.txt):
contiene una panoramica di FastAng e i collegamenti alle guide in Markdown,
leggibili senza la navigazione del sito. Puoi iniziare con questa richiesta:

Leggi https://fastang.dev/llms.txt e le guide pertinenti. Prima di proporre
modifiche, controlla la versione di @fastang/core nel package.json del progetto.
Usa le API documentate di FastAng, Angular e Fastify e mantieni separato il codice
server da quello del browser.

Se lo strumento accetta documenti allegati ma non può aprire i link, scarica
[llms-full.txt](https://fastang.dev/llms-full.txt) e aggiungilo al contesto:
contiene tutte le guide correnti in inglese. Puoi anche fornire soltanto le
singole guide Markdown elencate nell’indice, per limitare il contesto al lavoro
da svolgere.

Non tutti gli assistenti consultano automaticamente questi file: indica
esplicitamente il link o allega il documento. Prima della v1 le guide seguono
l’alpha corrente; per progetti con versioni precedenti consulta anche le
[note di rilascio](https://github.com/daclab-dev/fastang/releases).
Verifica sempre le modifiche generate con `npm run check` e `npm run build`,
oppure con i comandi equivalenti di pnpm, e con i test della tua applicazione.

## Controlla la produzione

```bash
npm run check
npm run build
npm start
```

Ferma il server di sviluppo prima di avviare la produzione sulla stessa porta. `npm run check` verifica route, tipi e template; non avvia un server.

Prosegui con [pagine e layout](routing.md), poi con [le API](api.md).
