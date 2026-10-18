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

Oggi non esistono un comando `fastang update` o un motore automatico di migrazioni
e codemod. Non sostituire l’intera cartella `src/` con un nuovo template. Per
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

## Versioni della documentazione e rollback

Usa il selettore sopra le guide. Gli URL versionati conservano la versione scelta;
link laterali, paginazione, collegamenti relativi delle guide e cambio lingua
restano nella stessa versione. Se una guida manca nella release selezionata, il
cambio versione apre il suo indice. Versioni o guide inesistenti restituiscono
HTTP 404, senza mostrare silenziosamente le istruzioni più recenti.

I link `/docs` senza versione aprono la documentazione corrente. Le guide
archiviate sono copie del repository al commit Git registrato per quella versione. L’archivio
parte da `0.1.0-alpha.1`: non inventa guide per release che non le avevano. Le
guide della versione corrente possono ricevere correzioni prima dell’archiviazione.

Per tornare indietro ripristina il commit precedente dell’app e il suo lockfile,
esegui `npm ci` e ripubblica quello stato verificato. Il solo downgrade del pacchetto
non annulla modifiche manuali ai sorgenti o migrazioni di database e servizi esterni.
