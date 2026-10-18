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

Apri `http://localhost:3278`. La porta 3278 corrisponde a FAST sulla tastiera telefonica. Il generatore crea una nuova cartella; rifiuta destinazioni già esistenti. `--install` esegue npm install. Senza questo flag devi eseguirlo nel progetto prima di avviarlo.

## CLI dedicata

Per usare direttamente `fastang new`, installa globalmente la CLI leggera:

```sh
npm install -g @fastang/cli@alpha
fastang new another-app --install
```

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

## Controlla la produzione

```bash
npm run check
npm run build
npm start
```

Ferma il server di sviluppo prima di avviare la produzione sulla stessa porta. `npm run check` verifica i tipi e i template; non avvia un server.

Prosegui con [pagine e layout](routing.md), poi con [le API](api.md).

## Supporto pnpm

Dalla versione `0.1.0-alpha.5` sono supportati npm e pnpm 10/11 per applicazioni indipendenti:

```sh
pnpm create fastang@alpha my-app --package-manager pnpm --install
cd my-app
pnpm run dev
```

Il generatore rileva il gestore che lo avvia dal suo user agent.
`--package-manager npm|pnpm` ha precedenza; senza indicazioni usa npm. Gli script
generati usano pnpm e `packageManager` registra la versione rilevata.
`--no-install` genera soltanto i file. `pnpm-workspace.yaml` elenca esplicitamente
i permessi degli script di build della toolchain Angular: `onlyBuiltDependencies`
con pnpm 10, `allowBuilds` con pnpm 11. Rivedi la policy quando cambi dipendenze.
Se la versione pnpm non è disponibile durante la generazione, autorizza gli
script necessari con `pnpm approve-builds` prima della build. Non vengono cambiate
le impostazioni globali di pnpm.

Usa `pnpm run check`, `pnpm run build`, `pnpm start` e `pnpm run build:vercel`.
L’output Vercel conserva i link relativi delle dipendenze ed è verificato fuori
dal progetto sorgente. La CI prova pnpm 10 e 11 su Linux con Node 24.

Per gli aggiornamenti la CLI usa `packageManager` e lockfile dell’applicazione,
anche quando viene avviata con un gestore diverso:

```sh
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha --yes
```

Il primo comando mostra solo il piano. Servono lockfile pnpm versione 9 per
un’app indipendente, core dal registry e installazione coerente con manifest
e lockfile. Restano i controlli su Node, peer dependency e downgrade. Lockfile
misti, dichiarazioni in conflitto e lockfile workspace condivisi bloccano
l’aggiornamento. Non si converte automaticamente il gestore; nei monorepo
l’aggiornamento delle dipendenze resta manuale.
