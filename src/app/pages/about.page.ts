import { TranslatePipe } from '../i18n/i18n';
import { Component } from '@angular/core';

@Component({
  imports: [TranslatePipe],
  template: `
    <section class="content-page"><div class="eyebrow">BUILD-TIME RENDERING</div><h1>{{ 'Una pagina.' | t }}<br><em>{{ 'Già pronta.' | t }}</em></h1>
    <p class="lead">{{ 'Questa rotta viene prerenderizzata durante' | t }} <code>npm run build</code>{{ '. In produzione Fastify serve l\\'HTML generato, senza eseguire di nuovo Angular sul server.' | t }}</p>
    <div class="note"><h2>{{ 'Una scelta esplicita' | t }}</h2><p>{{ 'Le pagine statiche si dichiarano in' | t }} <code>fastang.config.ts</code>{{ '. Anche una rotta parametrica può essere statica: basta elencarne gli URL concreti.' | t }}</p><p>{{ 'In sviluppo la pagina usa SSR per mostrare immediatamente le modifiche.' | t }}</p></div>
    </section>
  `,
})
export default class AboutPage {}
