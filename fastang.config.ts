import { defineConfig } from '@fastang/core/config';

export default defineConfig({
  // Esplicito: anche le rotte parametriche possono essere prerenderizzate.
  prerender: ['/about', '/en/about'],
  vercel: { functions: 'routes', pagePrefixes: ['', '/en'] },
});
