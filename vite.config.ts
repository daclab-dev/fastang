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
    noExternal: [/^@angular\//],
  },
  build: { outDir: 'dist/client' },
});
