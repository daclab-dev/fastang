import type { ResolveFn } from '@angular/router';
import { injectApiClient } from '@fastang/core/http-client';
import type { ApiSuccess } from '@fastang/core/contracts';
import { greetingContract } from '../../../shared/greeting';

const greeting: ResolveFn<ApiSuccess<typeof greetingContract>> = route =>
  injectApiClient().request(greetingContract, { params: { name: route.paramMap.get('name')! } });

export default { title: 'Greeting · FastAng', resolve: { greeting } };
