import { TranslatePipe } from '../../../i18n/i18n';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [TranslatePipe, RouterOutlet],
  template: `<div class="catalog-detail" data-testid="detail-layout"><span class="detail-label">{{ 'DETTAGLIO · LAYOUT ANNIDATO' | t }}</span><router-outlet /></div>`,
})
export default class DetailLayout {}
