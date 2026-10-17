import { TranslatePipe, LocalePathPipe } from '../i18n/i18n';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import brandMark from '../../assets/brand/fastang-shield-440.webp';
import originalLogo from '../../assets/brand/fastang-original.jpeg';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink],
  template: `
    <section class="brand-page">
      <div class="eyebrow">FASTANG / BRAND FOUNDATION 01</div>
      <div class="brand-intro"><div><h1>{{ 'Solidità Angular.' | t }}<br><em>{{ 'Energia Fastify.' | t }}</em></h1><p class="lead">{{ 'Lo scudo racconta struttura e affidabilità. La fiamma porta movimento e iniziativa. La nostra identità tiene insieme queste due forze.' | t }}</p></div><img [src]="brandMark" width="220" height="220" [alt]="'Scudo FastAng blu con fiamma arancio' | t" decoding="async"></div>
      <div class="brand-section-title"><span class="card-number">{{ '01 / ORIGINE' | t }}</span><h2>{{ 'Il logo è il punto di partenza.' | t }}</h2></div>
      <figure class="brand-original"><img [src]="originalLogo" width="1408" height="768" [alt]="'Logo originale FastAng: scudo blu e fiamma arancio con scritta FASTANG su fondo argento' | t"><figcaption>{{ 'Il JPEG originale è conservato integralmente. Lo scudo trasparente è un asset derivato per le superfici digitali.' | t }}</figcaption></figure>
      <div class="brand-section-title"><span class="card-number">02 / PALETTE</span><h2>{{ 'Dal metallo alla luce.' | t }}</h2><p>{{ 'Una base scura e stabile. Accenti luminosi, usati con intenzione.' | t }}</p></div>
      <dl class="brand-palette">@for (color of colors; track color.hex) {<div class="palette-color"><div class="color-sample" [style.background]="color.hex" aria-hidden="true"></div><dt>{{ color.name }}</dt><dd><code>{{ color.hex }}</code><span>{{ color.role | t }}</span></dd></div>}</dl>
      <div class="brand-section-title"><span class="card-number">03 / TYPOGRAPHY & VOICE</span><h2>{{ 'Preciso nel linguaggio. Distintivo nel segno.' | t }}</h2></div>
      <div class="brand-principles"><article class="type-specimen"><span class="card-number">SPACE GROTESK / DISPLAY</span><p class="type-display">FASTANG<br>Build with energy.</p><span class="type-alphabet">Aa Bb Cc 0123456789</span><p>{{ 'Geometrico per titoli e wordmark. Inter per testi, navigazione e controlli. Font serviti dal progetto, senza richieste a provider esterni.' | t }}</p></article><article><span class="card-number">TONE OF VOICE</span><h3>{{ 'Competente. Diretto. Concreto.' | t }}</h3><p>{{ 'Spieghiamo cosa fa il framework e mostriamo come funziona. La velocità è un obiettivo da misurare: numeri e confronti arrivano insieme ai benchmark.' | t }}</p><div class="voice-example"><span>{{ 'IL NOSTRO MODO DI DIRLO' | t }}</span><p>{{ '«Angular nativo. Fastify completo.»' | t }}</p></div></article></div>
      <div class="brand-section-title"><span class="card-number">{{ '04 / USO DEL MARCHIO' | t }}</span><h2>{{ 'Spazio al simbolo.' | t }}</h2></div>
      <div class="logo-usage"><div class="logo-on-dark"><img [src]="brandMark" width="180" height="180" [alt]="'Scudo su blu notte' | t"><span>{{ 'Superficie primaria / blu notte' | t }}</span></div><div class="logo-on-light"><img [src]="brandMark" width="180" height="180" [alt]="'Scudo su argento' | t"><span>{{ 'Superficie secondaria / argento' | t }}</span></div><div class="usage-rules"><h3>{{ 'Riconoscibile, a ogni scala.' | t }}</h3><p>{{ 'Proporzioni originali, spazio libero attorno allo scudo, nessuna tinta applicata al logo. La versione dettagliata rende meglio da 48 px; sotto questa soglia serve un segno semplificato dedicato.' | t }}</p><p>{{ 'Glow e orbite accompagnano il marchio nelle composizioni ampie. I testi e i controlli restano nitidi.' | t }}</p></div></div>
      <div class="brand-page-end"><span>{{ 'FASTANG — SOLIDITÀ ANGULAR. ENERGIA FASTIFY.' | t }}</span><a class="text-link" [routerLink]="'/' | localePath">{{ 'Torna al progetto ↗' | t }}</a></div>
    </section>
  `,
})
export default class BrandPage {
  readonly brandMark = brandMark;
  readonly originalLogo = originalLogo;
  readonly colors = [
    { name: 'Midnight', hex: '#070F1D', role: 'Base e profondità' },
    { name: 'Shield Blue', hex: '#245B96', role: 'Struttura e superfici' },
    { name: 'Arc Cyan', hex: '#67D7FF', role: 'Link e focus' },
    { name: 'Flame Orange', hex: '#FF9A3D', role: 'Azioni principali' },
    { name: 'Pulse Violet', hex: '#A999FF', role: 'Accento secondario' },
    { name: 'Alloy Silver', hex: '#EEF3FA', role: 'Testi e superfici chiare' },
  ];
}
