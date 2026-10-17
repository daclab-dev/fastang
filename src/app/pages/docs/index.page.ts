import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, LocalePathPipe, SiteLanguage } from '../../i18n/i18n';
import { guideNavigation } from '../../docs/navigation';

@Component({
  imports: [RouterLink, TranslatePipe, LocalePathPipe],
  template: `
    <div class="docs-intro"><div class="eyebrow">FASTANG / DOCS</div>
      <h1>{{ 'Dalla prima pagina' | t }}<br><em>{{ 'al deploy.' | t }}</em></h1>
      <p class="lead">{{ 'Un percorso pratico per costruire con Angular e Fastify. Parti dallo starter e aggiungi solo quello che serve alla tua applicazione.' | t }}</p>
      <a class="button primary" [routerLink]="'/docs/getting-started' | localePath">{{ 'Crea il primo progetto →' | t }}</a>
    </div>
    <div class="docs-index-grid">
      @for (guide of guides; track guide.slug; let index = $index) {
        <a [routerLink]="'/docs/' + guide.slug | localePath"><span>0{{ index + 1 }}</span><h2>{{ guide[language.current()] }}</h2><span aria-hidden="true">↗</span></a>
      }
    </div>
    <p class="docs-version">{{ 'Queste guide descrivono FastAng 0.1.0-alpha.0. Le API possono cambiare tra release alpha.' | t }}</p>
  `,
})
export default class DocumentationIndex {
  readonly guides = guideNavigation;
  readonly language = inject(SiteLanguage);
}
