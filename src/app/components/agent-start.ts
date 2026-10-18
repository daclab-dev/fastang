import { Component, computed, inject, signal } from '@angular/core';
import { SiteLanguage, TranslatePipe } from '../i18n/i18n';

@Component({
  selector: 'fastang-agent-start',
  imports: [TranslatePipe],
  template: `
    <section class="agent-start" aria-labelledby="agent-start-title">
      <div class="agent-start-heading">
        <div>
          <span class="eyebrow">FASTANG / AI</span>
          <h2 id="agent-start-title">{{ 'Crea con il tuo assistente AI' | t }}</h2>
          <p>{{ 'Copia il prompt nel tuo editor o assistente con accesso al terminale. Sostituisci my-app con il nome del progetto.' | t }}</p>
        </div>
        <button type="button" class="button" (click)="copy()">{{ (copied() ? 'Copiato' : 'Copia prompt') | t }}</button>
      </div>
      <textarea readonly rows="8" [value]="prompt()" [attr.aria-label]="'Prompt di creazione del progetto' | t" spellcheck="false"></textarea>
      <p class="agent-copy-status" role="status">{{ (failed() ? 'Copia non disponibile: seleziona il prompt e copialo manualmente.' : copied() ? 'Prompt copiato negli appunti.' : '') | t }}</p>
      <div class="agent-resources">
        <a href="/llms.txt">{{ 'Indice per AI' | t }} <span>↗</span></a>
        <a href="/llms-full.txt">{{ 'Documentazione completa per AI' | t }} <span>↗</span></a>
        <span>{{ 'Guide correnti · documento completo in inglese' | t }}</span>
      </div>
    </section>
  `,
})
export class AgentStart {
  private readonly language = inject(SiteLanguage);
  readonly copied = signal(false);
  readonly failed = signal(false);
  readonly prompt = computed(() => this.language.current() === 'it'
    ? 'Leggi https://fastang.dev/llms.txt e la guida iniziale collegata. Crea un nuovo progetto FastAng chiamato my-app usando la CLI ufficiale. Controlla i requisiti di Node e le opzioni documentate prima di eseguire i comandi. Usa il gestore di pacchetti del workspace; se non è definito, chiedimi di scegliere tra npm e pnpm. Se la cartella esiste già, fermati senza sovrascriverla. Installa le dipendenze e usa lo starter senza aggiungere funzionalità. Esegui i controlli e la build, segnala eventuali errori e indicami come avviare il progetto. Non avviare il server in background.'
    : 'Read https://fastang.dev/llms.txt and the linked getting started guide. Create a new FastAng project named my-app using the official CLI. Check Node requirements and documented options before running commands. Use the workspace package manager; if none is defined, ask me to choose npm or pnpm. If the destination directory already exists, stop without overwriting it. Install dependencies and use the starter without adding features. Run the checks and build, report any errors and explain how to start the project. Do not start a background server.');
  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.prompt());
      this.copied.set(true);
      this.failed.set(false);
    } catch {
      this.copied.set(false);
      this.failed.set(true);
    }
  }
}
