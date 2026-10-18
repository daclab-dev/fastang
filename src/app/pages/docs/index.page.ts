import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, LocalePathPipe, SiteLanguage } from '../../i18n/i18n';
import { DocumentationContext } from '../../docs/context';

@Component({
  selector: 'fastang-doc-index',
  imports: [RouterLink, TranslatePipe, LocalePathPipe],
  template: `
    @if (docs.version()) {<div class="docs-intro"><div class="eyebrow">FASTANG / DOCS</div>
      <h1>{{ 'Dalla prima pagina' | t }}<br><em>{{ 'al deploy.' | t }}</em></h1>
      <p class="lead">{{ 'Un percorso pratico per costruire con Angular e Fastify. Parti dallo starter e aggiungi solo quello che serve alla tua applicazione.' | t }}</p>
      <a class="button primary" [routerLink]="docs.path('getting-started') | localePath">{{ 'Crea il primo progetto →' | t }}</a>
    </div>
    <div class="docs-index-grid">
      @for (guide of docs.guides(); track guide.slug; let index = $index) {
        <a [routerLink]="docs.path(guide.slug) | localePath"><span>0{{ index + 1 }}</span><h2>{{ guide[language.current()] }}</h2><span aria-hidden="true">↗</span></a>
      }
    </div>
    <p class="docs-version">{{ 'Documentazione per' | t }} {{ docs.version()?.version }}. {{ 'Le API possono cambiare tra release alpha.' | t }}</p>
    } @else {<article class="docs-article"><h1>{{ 'Versione non trovata' | t }}</h1><a [routerLink]="'/docs' | localePath">{{ 'Torna alla documentazione →' | t }}</a></article>}
  `,
})
export default class DocumentationIndex {
  readonly docs = inject(DocumentationContext);
  readonly language = inject(SiteLanguage);
}
