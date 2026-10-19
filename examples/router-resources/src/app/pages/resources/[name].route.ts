import { httpResource } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { Router, type Route } from '@angular/router';
import { apiUrl, type ApiSuccess } from '@fastang/core/contracts';
import { greetingContract } from '../../../shared/greeting';

export default {
  title: 'Reactive greeting · FastAng',
  canActivate: [route => route.queryParamMap.get('preview') === 'blocked'
    ? inject(Router).createUrlTree(['/about'])
    : true],
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  resources: ({ params }) => {
    // Keep unrelated query navigation from rebuilding the HTTP request.
    const name = computed(() => params()['name']);
    return {
      greeting: httpResource<ApiSuccess<typeof greetingContract>>(() =>
        apiUrl(greetingContract, { params: { name: name() } }),
      ),
    };
  },
} satisfies Pick<Route, 'title' | 'canActivate' | 'runGuardsAndResolvers' | 'resources'>;
