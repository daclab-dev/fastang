# FastAng — Brand foundation 01

**Solidità Angular. Energia Fastify.**

Il punto di partenza è il logo fornito dall'autore in [`fastang.jpeg`](../../fastang.jpeg): uno scudo metallico blu con una fiamma arancio, luce ciano e bagliori viola su fondo argento. Questa identità deriva da quel segno e lo applica alla demo, senza sostituire l'originale.

La guida visuale è disponibile anche in **`/brand`** nell'applicazione.

## Idea del marchio

- **Lo scudo:** struttura, affidabilità e controllo; richiama il ruolo di Angular nell'interfaccia.
- **La fiamma:** iniziativa e movimento; esprime il ruolo di Fastify nel backend.
- **Le scariche ciano e viola:** il collegamento tra le due parti del sistema.
- **Il metallo:** una base tecnica, concreta, riconoscibile.

Il carattere è energico e ingegneristico. Il simbolo porta i dettagli e la luce; interfacce e documentazione mantengono spazio, gerarchia e leggibilità.

## Nome e firma

- Nome in prosa e codice: **FastAng**.
- Wordmark nelle composizioni di brand: **FASTANG**.
- Firma principale: **Solidità Angular. Energia Fastify.**
- Descrizione tecnica: **Angular nativo. Fastify completo.**
- Descrizione estesa: «La struttura di Angular incontra la flessibilità di Fastify. Un'unica base per interfacce, API e rendering sul server.»

La firma è una proposta di posizionamento adottata in questa prima versione. Non contiene una promessa quantitativa di prestazioni.

## Colori

| Nome | Valore | Ruolo |
| --- | --- | --- |
| Midnight | `#070F1D` | Sfondo principale, profondità, testo sulle CTA arancio |
| Shield Blue | `#245B96` | Colore strutturale, superfici e accenti ampi |
| Arc Cyan | `#67D7FF` | Link, focus, dettagli attivi |
| Flame Orange | `#FF9A3D` | Azione principale, prezzi e parole chiave |
| Pulse Violet | `#A999FF` | Accenti secondari, nesting, richiami elettrici |
| Alloy Silver | `#EEF3FA` | Testi principali e superfici chiare |

Neutri operativi: `#0C1B30` per i pannelli, `#10233C` per superfici rialzate, `#223B58` per i bordi, `#A8BACF` per testo secondario e `#91A8C1` per didascalie.

In una composizione tipica, privilegiare la base blu notte; riservare ciano e arancio ai punti che guidano lo sguardo. L'arancio identifica l'azione primaria, il ciano la navigazione. Il viola è un dettaglio, non un terzo colore dominante.

Le coppie principali superano il rapporto 4.5:1 per testo normale: Silver, Cyan, Orange, Violet e testo secondario su Midnight; Midnight su Orange. Shield Blue resta un colore strutturale: non usarlo per piccoli testi su Midnight.

I token implementati sono in [`src/styles.css`](../../src/styles.css), con prefisso `--brand-`. I colori di stato applicativo restano una convenzione semantica indipendente: non cambiare, per ragioni decorative, il significato di successo o errore.

## Tipografia

**Space Grotesk Variable** per wordmark, titoli e firma. Pesi 500–700; titoli con spaziatura leggermente stretta, wordmark con spaziatura aperta.

**Inter Variable** per testi, navigazione e controlli. Pesi 400–700; testo con interlinea ampia. Il codice usa uno stack monospace di sistema.

Entrambi i font sono open source e installati tramite Fontsource. Il build include i file WOFF2 latini; nessuna richiesta a servizi esterni. Le licenze sono incluse nei pacchetti `@fontsource-variable/space-grotesk` e `@fontsource-variable/inter`.

Scala orientativa: hero 40–62 px, titoli di sezione 22–30 px, testo 13–15 px, label 10–12 px. Sui dispositivi stretti ridurre il titolo e portare l'emblema sotto il testo.

## Logo e asset

| Asset | Uso |
| --- | --- |
| [`fastang.jpeg`](../../fastang.jpeg) | Originale dell'autore, invariato |
| [`fastang-original.jpeg`](../../src/assets/brand/fastang-original.jpeg) | Copia integra dell'originale, distribuita dalla demo |
| [`fastang-shield.png`](../../src/assets/brand/fastang-shield.png) | Master digitale derivato con ImageGen, sfondo realmente trasparente |
| [`fastang-shield-96.webp`](../../src/assets/brand/fastang-shield-96.webp) | Header e footer, anche su schermi ad alta densità |
| [`fastang-shield-440.webp`](../../src/assets/brand/fastang-shield-440.webp) | Guida di brand e dimostrazioni di uso |
| [`fastang-shield-880.webp`](../../src/assets/brand/fastang-shield-880.webp) | Hero della home |
| [`fastang-favicon-64.png`](../../src/assets/brand/fastang-favicon-64.png) | Icona del browser |

La variante PNG è una derivazione generativa dello scudo, non un tracciato vettoriale né un ritaglio pixel-per-pixel. Mantiene il linguaggio del logo e serve per header, hero e footer. Il JPEG originale resta il riferimento per confronti e lavorazioni future.

- Mantieni sempre le proporzioni. Lascia attorno al segno almeno un quinto della sua larghezza di spazio libero rispetto ad altri elementi.
- Preferisci il logo dettagliato da 48 px in su; il footer ne usa una versione secondaria da 32 px. Per usi molto piccoli servirà una variante ottica semplificata: il favicon attuale usa un export da 64 px del PNG dettagliato.
- Usa Midnight o Alloy Silver come superfici di appoggio.
- Non stirare, ruotare, ricolorare, coprire o applicare filtri cromatici allo scudo.
- Non tagliare il simbolo per simulare un marchio diverso. I fondi trasparenti restano trasparenti.
- Orbite e glow sono elementi di composizione separati, realizzati in CSS. Devono accompagnare il segno senza interferire con testi o controlli.
- Il JPEG con fondo argento è una composizione completa: non usarlo come piccolo badge su fondo scuro.

Gli export web mantengono le proporzioni e il canale alpha, con dimensioni commisurate all'uso. Sono prodotti da Sharp come passaggio tecnico di ridimensionamento/codifica dal master ImageGen. Per rigenerarli: `npm run brand:assets`. La demo importa gli export, così il master ad alta risoluzione non viene scaricato dagli utenti del sito.

Il wordmark tipografico della UI è un trattamento digitale complementare; non sostituisce quello contenuto nel JPEG originale.

## Interfaccia

CTA primaria arancio con testo Midnight, azioni secondarie in Cyan, focus visibile Cyan. Bordi sottili, raggi da 4–8 px, pannelli ben separati e spazio generoso. I gradienti danno profondità alle grandi superfici; i testi restano a tinta unita.

Evita glow sul corpo del testo, interfacce piene di neon, fondi animati invadenti e badge superflui. La versione corrente non anima il marchio e rispetta `prefers-reduced-motion` per le transizioni.

## Voce

Competente, diretta, concreta. Descrivi un comportamento e rendilo verificabile con un esempio.

- «Il server restituisce HTML già renderizzato.»
- «Una guard Angular produce un redirect HTTP 302.»
- «Angular nativo. Fastify completo.»

Le prestazioni vengono comunicate attraverso benchmark riproducibili e condizioni esplicite. Evita «il più veloce», «zero overhead» e confronti non misurati.

## Realizzazione e prompt

L'originale è stato ispezionato prima della lavorazione. Per lo scudo derivato è stato usato il tool integrato **ImageGen**, in modalità editing con sfondo trasparente, senza CLI o API esterne. Verificato il canale alpha dell'output (RGBA, alpha da 0 a 255); l'asset è salvato nel repository e importato da Vite con URL versionata dal build.

Prompt completo usato:

> Use case: background-extraction. Asset type: transparent brand emblem for FastAng website, derived from user's existing logo. Image 1 is the EDIT TARGET. Extract ONLY the central metallic blue shield with the orange flame/lightning emblem from the supplied image onto a genuinely transparent alpha background. Preserve the original shield silhouette, perspective, blue/cyan metal highlights, orange flame shape, violet electric interior, proportions and detailing as faithfully as possible. Remove the gray textured background, all orbital trails/sparks outside the shield, ground shadow, and the FASTANG wordmark below. Do not redesign, simplify, add text, add elements, or invent a different logo. Center the complete isolated shield, no clipping, tightly framed in a square canvas with about 8 percent clear padding. Clean crisp edges appropriate for a website brand asset.
