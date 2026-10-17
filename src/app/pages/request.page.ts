import { TranslatePipe } from '../i18n/i18n';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { RequestContextData } from '../../shared/contracts';

@Component({
  imports: [TranslatePipe],
  template: `
    <section class="content-page"><div class="eyebrow">REQUEST ISOLATION</div><h1>{{ 'Ogni richiesta.' | t }}<br><em>{{ 'Il suo contesto.' | t }}</em></h1>
    <p class="lead">{{ 'Il dato qui sotto proviene dall\\'API Fastify ed è isolato per richiesta.' | t }}</p><div class="product-details"><span>{{ 'Etichetta della richiesta' | t }}</span><strong data-testid="request-label">{{ label() }}</strong></div>
    <div class="note"><p>{{ 'Prova dal terminale:' | t }}</p><pre>curl -H 'x-request-label: Ada' http://localhost:3278/request</pre><p>{{ 'L\\'header è solo una dimostrazione, non un sistema di autenticazione. Non esiste una cache HTML condivisa per queste pagine.' | t }}</p></div></section>
  `,
})
export default class RequestPage {
  readonly label = signal('');
  constructor() {
    inject(HttpClient).get<RequestContextData>('/api/context').subscribe((data) => this.label.set(data.label));
  }
}
