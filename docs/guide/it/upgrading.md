# Aggiornare un progetto esistente

Aggiorna la dipendenza del framework nella tua app attuale. Il generatore crea
nuovi progetti: rieseguirlo non è una procedura di aggiornamento e rifiuta le
destinazioni esistenti. Pagine, API, stili e logica di business restano file dell’app.

## Scegli la release di destinazione

Crea un commit dell’app e del lockfile, leggi le note della nuova release e
controlla la versione installata. Questo esempio passa da `0.1.0-alpha.1` a
`0.1.0-alpha.2`.

```sh
npm ls @fastang/core
npm view @fastang/core@0.1.0-alpha.2 peerDependencies engines --json
```

Controlla Node e i peer della versione di destinazione prima di installare. Se
cambiano gli intervalli di Angular, Vite, TypeScript o altri peer, allinea anche le
dipendenze dell’app. Mantieni allineati tutti i pacchetti Angular fissati. Se cambiano i requisiti Node,
aggiorna insieme runtime, engines del progetto e impostazioni CI/deploy. Non usare
`--force` o `--legacy-peer-deps` per far sembrare riuscito un aggiornamento con
dipendenze incompatibili. Le alpha possono cambiare API anche all’interno della
stessa linea prerelease `0.1.0`. Leggi le
[note di rilascio](https://github.com/daclab-dev/fastang/releases).

## Installa e verifica

```sh
npm install --save-exact @fastang/core@0.1.0-alpha.2
npm run generate
npm run build
npm run build:vercel
```

Esegui anche i test dell’app e le verifiche del deploy che usi; il comando Vercel
serve soltanto se pubblichi su Vercel. Rivedi e committa insieme `package.json`,
`package-lock.json` e le modifiche di migrazione volute. Pubblica il commit
verificato. Il generatore normalmente non è installato nell’app generata e non
va aggiornato al suo interno.

Per un futuro passaggio stabile da `1.0.0` a `1.2.0`, il processo è lo stesso con
`1.2.0` come destinazione esplicita. È un esempio, non una release oggi pubblicata.
Le minor stabili dovranno preservare la compatibilità; i cambiamenti major
richiederanno istruzioni di migrazione. Durante l’alpha fanno fede le note di
rilascio, senza presumere compatibilità dal solo aspetto del numero di versione.

## Collegamenti applicativi e migrazioni

L’installazione aggiorna il framework, non le copie dei file dello starter presenti
nel progetto. In particolare `src/server/index.ts`, `start.ts`, `api-entry.ts`,
`vercel-entry.ts`, bootstrap/configurazione Angular e configurazioni Vite/FastAng
appartengono all’app. Se una release cambia questi collegamenti, applica la
migrazione documentata mantenendo il comportamento personalizzato.

Dalla release `0.1.0-alpha.3`, il pacchetto separato `@fastang/cli` gestisce
creazione e aggiornamenti. Puoi usarlo anche con un core precedente:

```sh
npx --package=@fastang/cli@0.1.0-alpha.6 fastang-cli update --to alpha
npx --package=@fastang/cli@0.1.0-alpha.6 fastang-cli update --to alpha --yes
```

Il primo comando mostra un piano; il secondo applica l’installazione npm.
`--to latest` segue il tag npm `latest`, che può differire da `alpha`.
Il piano confronta Node, peer installati e versione di destinazione. Manifest,
lockfile e core installato devono essere coerenti: correggi le differenze con
`npm install` o `npm ci` secondo il messaggio, poi rivedi il diff. La CLI blocca
incompatibilità e richiede `--allow-downgrade` per tornare a una versione precedente.
Se la versione è già presente e lo stato è coerente non installa nulla.
Le migrazioni dei sorgenti restano manuali. L’installazione npm può eseguire script
e non viene annullata automaticamente in caso di errore. Non sostituire l’intera cartella `src/` con un nuovo template. Per
confrontare lo starter della versione di destinazione, genera un’app separata
fuori dal progetto esistente:

```sh
cd ..
npm create fastang@0.1.0-alpha.2 fastang-comparison -- --install
```

Confronta soltanto i collegamenti e la configurazione interessati, poi applica a
mano le modifiche necessarie. `fastang generate` riscrive i moduli di registrazione
generati: non è uno strumento generale di migrazione. Il passaggio ad `alpha.2`
aggiunge funzionalità opzionali: gli endpoint esistenti non devono diventare
contratti e TypeBox non serve se non adotti gli schemi condivisi.

## Aggiornamenti pnpm

Esegui l’aggiornamento dalla cartella dell’app, con pnpm 10 o 11. Prima salva
il lavoro corrente in un commit, includendo `package.json` e `pnpm-lock.yaml`.

Per vedere cosa cambierebbe passando alla release alpha più recente:

```sh
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha
```

Il comando scarica ed esegue la CLI senza installarla globalmente. Mostra la
versione attuale, quella di destinazione e le eventuali incompatibilità con Node
o con le dipendenze dell’app. In questa fase i file del progetto restano invariati.

Dopo aver letto il piano e le [note di rilascio](https://github.com/daclab-dev/fastang/releases),
applica l’aggiornamento:

```sh
pnpm --package=@fastang/cli@alpha dlx fastang-cli update --to alpha --yes
```

FastAng usa pnpm per aggiornare `@fastang/core` e il lockfile. Pagine, endpoint,
stili e configurazioni dell’app restano tuoi: applica a mano le eventuali
migrazioni indicate nelle note della release.

Verifica il risultato con la build e con i test della tua applicazione:

```sh
pnpm run build
```

Se pubblichi su Vercel, esegui anche `pnpm run build:vercel`. Rivedi le modifiche
e committa insieme `package.json`, `pnpm-lock.yaml` e gli eventuali interventi sui sorgenti.

Per scegliere una release precisa, sostituisci `alpha` dopo `--to` con il suo
numero, ad esempio `--to 0.1.0-alpha.6`.

### Se l’aggiornamento si interrompe

La CLI segnala il controllo che non è passato. Se l’installazione non corrisponde
al lockfile, ripristinala con `pnpm install --frozen-lockfile`. Se hai appena
modificato le dipendenze in `package.json`, esegui invece `pnpm install` e rivedi
il lockfile aggiornato prima di riprovare.

Mantieni un solo lockfile e una dichiarazione `packageManager` coerente con pnpm.
L’aggiornamento automatico riguarda app indipendenti; nei monorepo con lockfile
condiviso aggiorna le dipendenze attraverso gli strumenti del workspace.

## Versioni della documentazione e rollback

Usa il selettore sopra le guide. Gli URL versionati conservano la versione scelta;
link laterali, paginazione, collegamenti relativi delle guide e cambio lingua
restano nella stessa versione. Se una guida manca nella release selezionata, il
cambio versione apre il suo indice. Versioni o guide inesistenti restituiscono
HTTP 404, senza mostrare silenziosamente le istruzioni più recenti.

Prima della v1 il selettore espone solo la documentazione corrente, aggiornata
in modo continuo. Le guide delle alpha precedenti non restano sul sito; i sorgenti
restano nei tag Git. Gli URL versionati delle alpha ritirate restituiscono 404.
Gli archivi della documentazione partiranno dalle release stabili v1. `/docs`
apre le guide correnti.

Per tornare indietro ripristina il commit precedente dell’app e il suo lockfile,
esegui `npm ci` oppure `pnpm install --frozen-lockfile`, secondo il gestore del
progetto, e ripubblica quello stato verificato. Il solo downgrade del pacchetto
non annulla modifiche manuali ai sorgenti o migrazioni di database e servizi esterni.
