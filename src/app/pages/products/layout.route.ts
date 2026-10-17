import { CATALOG_SCOPE } from '../../catalog';
import type { RouteMetadata } from '../../../shared/routing';

export default {
  data: { section: 'Catalogo' },
  providers: [{ provide: CATALOG_SCOPE, useFactory: () => ({ resolutions: 0 }) }],
} satisfies RouteMetadata;
