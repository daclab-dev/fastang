import { SiteLanguage } from './i18n/i18n';
import { InjectionToken, REQUEST_CONTEXT, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, type CanActivateFn, type ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import type { Product } from '../shared/contracts';
import type { RenderContext } from '../shared/render-context';

export const CATALOG_SCOPE = new InjectionToken<{ resolutions: number }>('CATALOG_SCOPE');
export interface CatalogPageData {
  product: Product | null;
  error: string;
  resolution: number;
}

// Dimostrazione del lifecycle del router, non un controllo di autenticazione.
export const previewGuard: CanActivateFn = (route) => {
  return route.queryParamMap.get('preview') === 'blocked'
    ? inject(Router).createUrlTree([inject(SiteLanguage).path('/catalog-access')], {
      queryParams: route.queryParamMap.has('ref') ? { ref: route.queryParamMap.get('ref') } : undefined,
      fragment: route.fragment ?? undefined,
    })
    : true;
};

export const productResolver: ResolveFn<CatalogPageData> = (route) => {
  const scope = inject(CATALOG_SCOPE);
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  const resolution = ++scope.resolutions;
  return inject(HttpClient).get<Product>(`/api/products/${encodeURIComponent(route.paramMap.get('id') ?? '')}`).pipe(
    map((product) => ({ product, error: '', resolution })),
    catchError((error: HttpErrorResponse) => {
      if (context) context.status = error.status === 404 ? 404 : 502;
      return of({
        product: null, resolution,
        error: error.status === 404 ? 'Questo prodotto non esiste nel catalogo demo.' : 'Impossibile caricare il prodotto.',
      });
    }),
  );
};
