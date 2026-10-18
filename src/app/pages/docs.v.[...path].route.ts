import { guideResolver, guideTitle } from '../docs/resolver';
export default { title: guideTitle, resolve: { guide: guideResolver }, runGuardsAndResolvers: 'always' as const };
