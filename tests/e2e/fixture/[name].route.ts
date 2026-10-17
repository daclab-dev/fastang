import { REQUEST_CONTEXT, inject } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';
import { injectApiClient } from '@fastang/core/http-client';
import { greetingContract } from '../../../shared/greeting';
import { Router, type CanActivateFn, type ResolveFn, type Route } from '@angular/router';
import { catchError, of } from 'rxjs';
import type { RenderContext } from '@fastang/core';

const previewGuard: CanActivateFn = route => route.queryParamMap.get('preview') === 'blocked'
  ? inject(Router).createUrlTree(['/about'])
  : true;

const greeting: ResolveFn<{ message: string }> = route => {
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  return injectApiClient().request(greetingContract, { params: { name: route.paramMap.get('name')! } }).pipe(
    catchError((error: HttpErrorResponse) => {
      if (context) context.status = error.status === 404 ? 404 : 502;
      return of({ message: 'Greeting unavailable.' });
    }),
  );
};

export default {
  title: 'Greeting · FastAng',
  canActivate: [previewGuard],
  resolve: { greeting },
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
} satisfies Pick<Route, 'title' | 'canActivate' | 'resolve' | 'runGuardsAndResolvers'>;
