# Pagine, routing e layout

Definisci la struttura con i file e usa il router Angular per metadati, guard e resolver.

## Convenzioni dei file

I componenti delle pagine esportano una classe come default. Lo starter configura `provideRouter` con `withComponentInputBinding()`: parametri e dati risolti possono arrivare agli input del componente.

| File in src/app/pages | URL |
| --- | --- |
| `index.page.ts` | `/` |
| `about.page.ts` | `/about` |
| `greet/[name].page.ts` | `/greet/:name` |
| `(public)/help.page.ts` | `/help` |
| `[...slug].page.ts` | Catch-all terminale |

Le cartelle tra parentesi organizzano il codice senza aggiungere un segmento all'URL. Le rotte statiche precedono quelle dinamiche. Il generatore rifiuta percorsi equivalenti o parametri duplicati.

## Aggiungi un layout

Crea questo file nello starter. Il layout avvolge la pagina `/greet/world` e resta attivo durante la navigazione tra i suoi figli.

```ts file=src/app/pages/greet/layout.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  template: '<section aria-label="Greetings"><h2>Greetings</h2><router-outlet /></section>',
})
export default class GreetingLayout {}
```

Un layout deve contenere `RouterOutlet` per mostrare la pagina figlia. Puoi annidare altri `layout.ts`; `layout.route.ts` configura i metadati del layout.

## Metadati della pagina

Il file adiacente `greet/[name].route.ts` esporta i metadati Angular. Il percorso, il componente e la gerarchia sono generati: non definirli nei metadati. Usa `title`, `resolve`, `providers`, `canActivate` e `runGuardsAndResolvers` per il comportamento della rotta.

Usa `RouterLink` per la navigazione interna. Non modificare `src/app/fastang.routes.ts`: viene rigenerato. `npm run generate` aggiorna esplicitamente il manifest; il dev server rileva aggiunte e rimozioni di file di rotta.

## Stato per richiesta

Non conservare dati di richieste o utenti in variabili di modulo. Per i provider mutabili di rotta usa una factory, per esempio `useFactory: () => ({ count: 0 })`. FastAng ricrea gli oggetti delle route per ogni rendering SSR.

Continua con [caricamento dati e rendering](rendering.md). Per il comportamento standard consulta [il router Angular](https://angular.dev/guide/routing).

## Ispezionare le rotte (prossima alpha)

Da un’app che usa il ramo main o la prossima alpha, esegui:

```sh
npx fastang routes
npx fastang routes --json
```

La vista testuale elenca le pagine nell’ordine di corrispondenza, con file
sorgente, layout antenati e metadati, seguite dai metodi API. Il JSON restituisce
un documento con `schemaVersion: 1` e gli array `pages` e `api`; ogni pagina
include i propri `layouts` dall’esterno verso l’interno. I file sono relativi
alla cartella dell’app.

L’ispezione legge i nomi dei file senza eseguire codice applicativo, generare file
o avviare un server. Rotte ambigue e metadati senza pagina producono gli stessi
errori della generazione. La mappa descrive le convenzioni dei file: non include
prefissi aggiunti dal router Angular, rotte dei plugin o rotte HEAD implicite.
Non deduce le regole di rendering o deploy. Il comando non è presente in npm
`0.1.0-alpha.1`.
