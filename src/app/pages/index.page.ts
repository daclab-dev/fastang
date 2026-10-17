import { TranslatePipe, LocalePathPipe } from '../i18n/i18n';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import brandMark from '../../assets/brand/fastang-shield-880.webp';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span></span> ANGULAR + FASTIFY / FULLSTACK FRAMEWORK</div>
        <h1>{{ 'Un frontend solido.' | t }}<br><em>{{ 'Energia, fino al server.' | t }}</em></h1>
        <p class="lead">{{ 'La struttura di Angular incontra la flessibilità di Fastify. Un\\'unica base per interfacce, API e rendering sul server.' | t }}</p>
        <div class="actions"><a class="button" [routerLink]="'/products/starter' | localePath">{{ 'Esplora la demo' | t }} <span>↗</span></a><a class="text-link" [routerLink]="'/brand' | localePath">{{ 'Dentro il brand' | t }} <span>→</span></a></div>
        <div class="hero-signature"><span class="signature-line"></span> {{ 'SOLIDITÀ ANGULAR. ENERGIA FASTIFY.' | t }}</div>
      </div>
      <div class="hero-emblem" [aria-label]="'Scudo FastAng: blu metallico e fiamma arancio' | t" role="img">
        <span class="orbit orbit-one" aria-hidden="true"></span><span class="orbit orbit-two" aria-hidden="true"></span>
        <img [src]="brandMark" width="440" height="440" alt="" fetchpriority="high" decoding="async">
        <span class="emblem-tag emblem-tag-top" aria-hidden="true"><i></i> ANGULAR NATIVE</span>
        <span class="emblem-tag emblem-tag-bottom" aria-hidden="true"><i></i> FASTIFY AT CORE</span>
      </div>
    </section>
    <section class="terminal" [aria-label]="'Avvio del progetto' | t">
      <div class="terminal-command"><span class="terminal-symbol">›_</span><code><span class="muted">$</span> npm run dev</code></div>
      <div class="terminal-stack"><span><i></i> Angular + Vite</span><span><i></i> Fastify API + SSR</span></div>
      <a href="/api/health" target="_blank" rel="noopener">API health <span>↗</span></a>
    </section>
    <section class="features" [aria-label]="'Funzionalità disponibili' | t">
      <article><span class="card-number"><b>01</b> / RENDERING</span><h2>{{ 'HTML dal server.' | t }}</h2><p>{{ 'SSR Angular, hydration ed event replay. La pagina arriva già renderizzata e diventa interattiva nel browser.' | t }}</p><div class="counter"><button type="button" (click)="count.set(count() + 1)" data-testid="counter">Click: {{ count() }}</button><span>{{ 'Prova l\\'interattività ↗' | t }}</span></div></article>
      <article><span class="card-number"><b>02</b> / SERVER</span><h2>{{ 'Fastify, direttamente.' | t }}</h2><p>{{ 'Endpoint con schemi di validazione e serializzazione. Plugin e hook rimangono quelli del server che conosci.' | t }}</p><code>GET /api/products/:id</code><a [routerLink]="'/products/workshop' | localePath">{{ 'Vedi il flusso completo →' | t }}</a></article>
      <article><span class="card-number"><b>03</b> / BUILD</span><h2>{{ 'Statico dove serve.' | t }}</h2><p>{{ 'Prerendering esplicito per le pagine pubbliche. Il resto viene renderizzato su richiesta dallo stesso server.' | t }}</p><code>prerender: ['/about', '/en/about']</code><a [routerLink]="'/about' | localePath">{{ 'Apri la pagina statica →' | t }}</a></article>
    </section>
    <section class="brand-invitation"><div><span class="eyebrow">{{ 'IL SEGNO, IL CARATTERE' | t }}</span><h2>{{ 'Uno scudo. Due energie.' | t }}</h2><p>{{ 'Il blu della struttura, l\\'arancio dell\\'azione. Un\\'identità che nasce dal logo FastAng.' | t }}</p></div><a class="text-link" [routerLink]="'/brand' | localePath">{{ 'Esplora l\\'identità' | t }} <span>↗</span></a></section>
  `,
})
export default class HomePage {
  readonly brandMark = brandMark;
  readonly count = signal(0);
}
