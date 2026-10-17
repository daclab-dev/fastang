import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteLanguage } from '../i18n/i18n';
import { inline } from './markdown';

@Component({
  selector: 'fastang-doc-inline', imports: [RouterLink],
  template: `@for (part of parts(); track $index) {@switch (part.kind) {
    @case ('code') {<code>{{ part.text }}</code>}
    @case ('strong') {<strong>{{ part.text }}</strong>}
    @case ('link') {@if (part.href!.startsWith('https://')) {<a [href]="part.href">{{ part.text }}</a>} @else {<a [routerLink]="language.path('/docs/' + part.href!.replace('.md', ''))">{{ part.text }}</a>}}
    @default {<ng-container>{{ part.text }}</ng-container>}
  }}`,
})
export class DocInline {
  readonly text = input.required<string>();
  readonly language = inject(SiteLanguage);
  readonly parts = computed(() => inline(this.text()));
}
