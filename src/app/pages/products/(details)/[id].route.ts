import { previewGuard, productResolver } from '../../../catalog';
import type { RouteMetadata } from '../../../../shared/routing';

export default {
  title: 'Prodotto | FastAng',
  canActivate: [previewGuard],
  resolve: { page: productResolver },
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
} satisfies RouteMetadata;
