import { Component, afterNextRender, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, LocalePathPipe, SiteLanguage } from '../../i18n/i18n';
import { inject } from '@angular/core';
import { DocumentationContext } from '../../docs/context';
import { CURRENT_DOCS_VERSION, documentationVersions, switchDocumentation } from '../../docs/versions';
import { Router } from '@angular/router';

@Component({
  selector: 'fastang-doc-layout',
  imports: [RouterLink, RouterOutlet, TranslatePipe, LocalePathPipe],
  template: `
    <section class="docs-shell">
      <aside class="docs-sidebar">
        <a class="docs-heading" [routerLink]="docs.path() | localePath">{{ 'Documentazione' | t }}<span>{{ docs.version()?.version }}</span></a>
        <nav class="docs-navigation" [aria-label]="'Documentazione' | t">
          @for (guide of docs.guides(); track guide.slug) {
            <a [routerLink]="docs.path(guide.slug) | localePath" [class.active]="docs.location().slug === guide.slug" [attr.aria-current]="docs.location().slug === guide.slug ? 'page' : null">{{ guide[language.current()] }}</a>
          }
        </nav>
        <a class="docs-source" [href]="source()">{{ 'Guide su GitHub ↗' | t }}</a>
      </aside>
      <div class="docs-main">
        <div class="docs-toolbar">
          <label for="docs-version">{{ 'Versione della documentazione' | t }}</label>
          <select id="docs-version" [disabled]="!ready()" [attr.aria-busy]="!ready()" [value]="docs.version()?.slug ?? ''" (change)="changeVersion($event)">
            @if (!docs.version()) {<option value="" disabled>{{ 'Versione non trovata' | t }}</option>}
            @for (version of versions; track version.version) {
              <option [value]="version.slug" [attr.selected]="docs.version()?.slug === version.slug ? '' : null">{{ version.version }}{{ version.version === current ? ' · ' + ('corrente' | t) : '' }}</option>
            }
          </select>
          @if (docs.version()?.version !== current && docs.version()) {<span class="docs-archive-note">{{ 'Versione archiviata' | t }}</span>}
        </div>
        <nav class="docs-ai-links" [aria-label]="'Risorse per assistenti AI' | t">
          <span>AI / CONTEXT</span>
          <a href="/llms.txt">{{ 'Indice per AI' | t }} ↗</a>
          <a href="/llms-full.txt">{{ 'Documentazione completa per AI' | t }} ↗</a>
          <a [routerLink]="'/docs/getting-started' | localePath" [fragment]="language.current() === 'it' ? 'usare-fastang-con-un-assistente-ai' : 'use-fastang-with-an-ai-assistant'">{{ 'Come usarla' | t }} →</a>
        </nav>
        <ng-content />
        <router-outlet />
      </div>
    </section>
  `,
})
export default class DocumentationLayout {
  readonly ready = signal(false);
  constructor() { afterNextRender(() => this.ready.set(true)); }
  readonly docs = inject(DocumentationContext);
  readonly versions = documentationVersions;
  readonly current = CURRENT_DOCS_VERSION;
  private readonly router = inject(Router);
  source() { const version = this.docs.version(); return `https://github.com/daclab-dev/fastang/tree/${version?.ref ?? 'main'}/docs/guide`; }
  changeVersion(event: Event) {
    const version = this.versions.find(version => version.slug === (event.target as HTMLSelectElement).value);
    if (version) void this.router.navigateByUrl(this.language.path(switchDocumentation(this.language.url(), version)));
  }
  readonly language = inject(SiteLanguage);
}
