import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { fastang } from './framework/vite-plugin.ts';

export default defineConfig({
  plugins: [angular(), fastang()],
  resolve: { mainFields: ['module'] },
  environments: {
    client: { define: { ngServerMode: 'false' } },
    ssr: { define: { ngServerMode: 'true' } },
  },
  ssr: {
    // Keep Fastify's injection chain in the ESM bundle: Vercel's launcher can
    // disable require(ESM), which light-my-request needs for cookie v2.
    noExternal: [/^@angular\//, 'fastify', 'light-my-request', 'cookie'],
  },
  build: { outDir: 'dist/client' },
});
