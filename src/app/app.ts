import { TranslatePipe, LocalePathPipe, SiteLanguage } from './i18n/i18n';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import brandMark from '../assets/brand/fastang-shield-96.webp';

@Component({
  selector: 'app-root',
  imports: [TranslatePipe, LocalePathPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header>
      <a class="brand" [routerLink]="'/' | localePath" aria-label="FastAng home">
        <img [src]="brandMark" width="48" height="48" alt="" decoding="async">
        <span class="brand-name">FASTANG<span class="brand-caption">ANGULAR + FASTIFY</span></span>
        <span class="version">0.1</span>
      </a>
      <nav [aria-label]="'Navigazione principale' | t">
        <a [routerLink]="'/' | localePath" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Overview</a>
        <a [routerLink]="'/about' | localePath" routerLinkActive="active">{{ 'Pagina statica' | t }}</a>
        <a [routerLink]="'/products/starter' | localePath" routerLinkActive="active">{{ 'Prodotto SSR' | t }}</a>
        <a [routerLink]="'/request' | localePath" routerLinkActive="active">Request context</a>
        <a [routerLink]="'/brand' | localePath" routerLinkActive="active">Brand</a>
      </nav>
      <span class="runtime" [attr.data-hydrated]="hydrated()"><i></i>{{ (hydrated() ? 'Client connesso' : 'Server render') | t }}</span>
      <div class="language-switch" role="group" aria-label="Language / Lingua">
        <a [routerLink]="language.switchTo('it')" [attr.aria-current]="language.current() === 'it' ? 'true' : null" lang="it" aria-label="Italiano">IT</a>
        <a [routerLink]="language.switchTo('en')" [attr.aria-current]="language.current() === 'en' ? 'true' : null" lang="en" aria-label="English">EN</a>
      </div>
    </header>
    <main><router-outlet /></main>
    <footer>
      <div class="footer-brand"><img [src]="brandMark" width="32" height="32" alt="" loading="lazy"><span><strong>FASTANG</strong><span>{{ 'Solidità Angular. Energia Fastify.' | t }}</span></span></div>
      <div class="footer-meta"><div class="footer-links"><a [routerLink]="'/brand' | localePath">{{ 'Identità del progetto ↗' | t }}</a><a [routerLink]="'/author' | localePath">{{ 'L\\'autore · Dario Chiapperini ↗' | t }}</a></div><span>{{ 'Prototipo 0.1 · Node runtime' | t }}</span></div>
    </footer>
  `,
})
export class App {
  readonly language = inject(SiteLanguage);
  readonly brandMark = brandMark;
  readonly hydrated = signal(false);
  constructor() { afterNextRender(() => this.hydrated.set(true)); }
}
