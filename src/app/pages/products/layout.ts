import { TranslatePipe, LocalePathPipe } from '../../i18n/i18n';
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <section class="catalog-shell" data-testid="catalog-layout">
      <div class="catalog-heading"><div><div class="eyebrow">{{ 'CATALOGO · LAYOUT DI SEZIONE' | t }}</div><p>{{ 'La sezione resta attiva mentre cambi prodotto.' | t }}</p></div>
      <button class="layout-counter" type="button" (click)="count.set(count() + 1)" data-testid="layout-counter">Layout: {{ count() }}</button></div>
      <nav class="catalog-nav" [aria-label]="'Catalogo' | t">
        <a [routerLink]="'/products/starter' | localePath" routerLinkActive="active">Starter</a>
        <a [routerLink]="'/products/workshop' | localePath" routerLinkActive="active">Workshop</a>
        <a [routerLink]="'/products/starter' | localePath" [queryParams]="{ preview: 'blocked' }">{{ 'Prova la guard →' | t }}</a>
      </nav>
      <router-outlet />
    </section>
  `,
})
export default class CatalogLayout {
  readonly count = signal(0);
}
