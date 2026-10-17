import { defineConfig } from './framework/config';

export default defineConfig({
  // Esplicito: anche le rotte parametriche possono essere prerenderizzate.
  prerender: ['/about', '/en/about'],
  vercel: { functions: 'routes', pagePrefixes: ['', '/en'] },
});
