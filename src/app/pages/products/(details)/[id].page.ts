import { TranslatePipe } from '../../../i18n/i18n';
import { Component, input } from '@angular/core';
import type { CatalogPageData } from '../../../catalog';

@Component({
  imports: [TranslatePipe],
  template: `
    <section class="content-page"><div class="eyebrow">DYNAMIC ROUTE · ANGULAR RESOLVER</div>
    @if (page().product; as item) {
      <h1>{{ item.name }}</h1><p class="lead">{{ item.description | t }}</p>
      <div class="product-details"><span>{{ 'Prezzo demo' | t }}</span><strong>€ {{ item.price }}</strong><code>GET /api/products/{{ item.id }}</code></div>
      <div class="note"><h2>{{ 'Dati pronti prima della pagina' | t }}</h2><p>{{ 'Un resolver Angular carica il prodotto con HttpClient. Il router passa il risultato all\\'input del componente. Durante l\\'hydration, la cache HTTP riutilizza i dati trasferiti dal server.' | t }}</p></div>
    } @else { <h1>{{ 'Prodotto non trovato' | t }}</h1><p class="lead">{{ page().error | t }}</p> }
    <p class="resolution-count" data-testid="resolution-count">{{ 'Risoluzioni in questo layout:' | t }} {{ page().resolution }}</p>
    </section>
  `,
})
export default class ProductPage {
  readonly page = input.required<CatalogPageData>();
}
