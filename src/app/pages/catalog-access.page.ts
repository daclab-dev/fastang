import { TranslatePipe, LocalePathPipe } from '../i18n/i18n';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink],
  template: `<section class="content-page"><div class="eyebrow">ANGULAR ROUTE GUARD</div><h1>{{ 'Anteprima non disponibile.' | t }}</h1><p class="lead">{{ 'La guard ha intercettato la navigazione prima di caricare il prodotto e ha restituito un UrlTree Angular.' | t }}</p><div class="note"><p>{{ 'È una dimostrazione basata sul parametro' | t }} <code>preview=blocked</code>{{ '. Non è un meccanismo di autenticazione o autorizzazione.' | t }}</p></div><a class="button" [routerLink]="'/products/starter' | localePath">{{ 'Torna al catalogo →' | t }}</a></section>`,
})
export default class CatalogAccessPage {}
