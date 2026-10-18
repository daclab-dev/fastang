import { defineConfig } from '@fastang/core/config';
import { guideNavigation } from './src/app/docs/navigation';
import { documentationVersions, documentationPath } from './src/app/docs/versions';

export default defineConfig({
  // Esplicito: anche le rotte parametriche possono essere prerenderizzate.
  prerender: ['/about', '/en/about', ...['', '/en'].flatMap(prefix => [prefix + '/docs', ...guideNavigation.map(guide => prefix + '/docs/' + guide.slug), ...documentationVersions.flatMap(version => [prefix + documentationPath(version), ...version.guides.map(guide => prefix + documentationPath(version, guide.slug))])])],
  vercel: { functions: 'routes', pagePrefixes: ['', '/en'] },
});
