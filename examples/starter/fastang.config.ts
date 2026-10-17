import { defineConfig } from '@fastang/core';
export default defineConfig({ prerender: ['/about'], vercel: { functions: 'routes' } });
