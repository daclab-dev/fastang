import { Component, computed, effect, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, LocalePathPipe } from '../../i18n/i18n';
import { DocInline } from '../../docs/inline';
import { documentationVersions } from '../../docs/versions';
import { inject } from '@angular/core';
import { DocumentationContext } from '../../docs/context';
import type { GuideData } from '../../docs/resolver';

@Component({
  selector: 'fastang-doc-article',
  imports: [RouterLink, TranslatePipe, LocalePathPipe, DocInline],
  template: `
    @if (guide().article; as article) {
      <div class="docs-article-layout">
        <article class="docs-article">
          <div class="eyebrow">FASTANG / {{ 'GUIDA' | t }}</div><h1>{{ article.title }}</h1>
          @for (block of article.blocks; track $index) {
            @switch (block.kind) {
              @case ('heading') {@if (block.level === 2) {<h2 [id]="block.id">{{ block.text }}</h2>} @else {<h3 [id]="block.id">{{ block.text }}</h3>}}
              @case ('paragraph') {<p><fastang-doc-inline [text]="block.text" /></p>}
              @case ('list') {<ul>@for (item of block.items; track $index) {<li><fastang-doc-inline [text]="item" /></li>}</ul>}
              @case ('table') {<div class="docs-table"><table><thead><tr>@for (header of block.headers; track $index) {<th scope="col"><fastang-doc-inline [text]="header" /></th>}</tr></thead><tbody>@for (row of block.rows; track $index) {<tr>@for (cell of row; track $index) {<td><fastang-doc-inline [text]="cell" /></td>}</tr>}</tbody></table></div>}
              @case ('code') {<div class="docs-code"><div class="docs-code-bar"><span>{{ block.file ?? block.language }}</span><button type="button" (click)="copy(block.text, $index)" [attr.aria-label]="'Copia codice' | t">{{ copied() === $index ? ('Copiato' | t) : ('Copia' | t) }}</button></div><pre tabindex="0"><code>{{ block.text }}</code></pre></div>}
            }
          }
          <p class="docs-copy-status" aria-live="polite">{{ copyFailed() ? ('Copia non disponibile: seleziona il codice e copialo manualmente.' | t) : '' }}</p>
          <nav class="docs-pagination" [aria-label]="'Navigazione delle guide' | t">
            @if (previous(); as previous) {<a [routerLink]="docs.path(previous.slug) | localePath"><span>← {{ 'Precedente' | t }}</span>{{ previous[guide().language] }}</a>}
            @if (next(); as next) {<a [routerLink]="docs.path(next.slug) | localePath"><span>{{ 'Successiva' | t }} →</span>{{ next[guide().language] }}</a>}
          </nav>
        </article>
        <aside class="docs-toc"><h2>{{ 'In questa pagina' | t }}</h2>@for (section of article.sections; track section.id) {<a [href]="(docs.path(guide().slug) | localePath) + '#' + section.id">{{ section.text }}</a>}</aside>
      </div>
    } @else {
      <article class="docs-article"><h1>{{ 'Guida non trovata' | t }}</h1><p>{{ 'Scegli una delle guide disponibili per continuare.' | t }}</p><a [routerLink]="docs.path() | localePath">{{ 'Torna alla documentazione →' | t }}</a></article>
    }
  `,
})
export default class DocumentationArticle {
  readonly guide = input.required<GuideData>();
  readonly copied = signal(-1);
  readonly copyFailed = signal(false);
  readonly docs = inject(DocumentationContext);
  private readonly guides = computed(() => documentationVersions.find(version => version.version === this.guide().version)?.guides ?? []);
  private readonly position = computed(() => this.guides().findIndex(guide => guide.slug === this.guide().slug));
  readonly previous = computed(() => this.guides()[this.position() - 1]);
  readonly next = computed(() => this.guides()[this.position() + 1]);
  constructor() {
    effect(() => { this.guide().slug; this.guide().version; this.copied.set(-1); this.copyFailed.set(false); });
  }
  async copy(text: string, index: number) {
    try { await navigator.clipboard.writeText(text); this.copied.set(index); this.copyFailed.set(false); }
    catch { this.copyFailed.set(true); }
  }
}
