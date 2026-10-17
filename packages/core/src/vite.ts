import { defineConfig, type UserConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { fastang } from './vite-plugin.ts';
export function defineFastangConfig(config: UserConfig = {}) {
  return defineConfig({
    ...config,
    plugins: [angular(), fastang(), ...(config.plugins ?? [])],
    resolve: { ...config.resolve, mainFields: ['module', ...(config.resolve?.mainFields ?? [])] },
    environments: {
      ...config.environments,
      client: { ...config.environments?.client, define: { ngServerMode: 'false', ...config.environments?.client?.define } },
      ssr: { ...config.environments?.ssr, define: { ngServerMode: 'true', ...config.environments?.ssr?.define } },
    },
    ssr: { ...config.ssr, noExternal: [...(Array.isArray(config.ssr?.noExternal) ? config.ssr.noExternal : []), /^@angular\//, /^@fastang\/core(?:\/|$)/, 'fastify', 'light-my-request', 'cookie'] },
    build: { outDir: 'dist/client', ...config.build },
  });
}
