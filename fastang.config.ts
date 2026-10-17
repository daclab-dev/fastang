import { defineConfig } from '@fastang/core/config';
import { guideNavigation } from './src/app/docs/navigation';

export default defineConfig({
  // Esplicito: anche le rotte parametriche possono essere prerenderizzate.
  prerender: ['/about', '/en/about', ...['', '/en'].flatMap(prefix => [prefix + '/docs', ...guideNavigation.map(guide => prefix + '/docs/' + guide.slug)])],
  vercel: { functions: 'routes', pagePrefixes: ['', '/en'] },
});
