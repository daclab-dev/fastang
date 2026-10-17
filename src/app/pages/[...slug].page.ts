import { TranslatePipe, LocalePathPipe } from '../i18n/i18n';
import { Component, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RenderContext } from '../../shared/render-context';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink],
  template: `<section class="content-page"><div class="eyebrow">404</div><h1>{{ 'Pagina non trovata.' | t }}</h1><p class="lead">{{ 'La pagina che cerchi non è disponibile.' | t }}</p><a class="button" [routerLink]="'/' | localePath">{{ 'Torna alla home →' | t }}</a></section>`,
})
export default class NotFoundPage {
  constructor() {
    const context = inject(REQUEST_CONTEXT) as RenderContext | null;
    if (context) context.status = 404;
  }
}
