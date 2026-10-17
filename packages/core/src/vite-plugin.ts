import type { Plugin } from 'vite';
import { generate } from './routes.ts';

export function isServerModule(id: string): boolean {
  const path = id.replaceAll('\\', '/').split('?')[0];
  return /\/(src\/server|framework|\.fastang)\//.test(path)
    || /\.server\.[cm]?[jt]s$/.test(path)
    || /\/(?:@fastang\/core|packages\/core)\/(?:src|dist)\/(?:index|server|http-server|node-handler|listen|angular|api|contract-route|routes|vite|vite-plugin|cli|commands\/.*|adapters\/.*)\.[cm]?[jt]s$/.test(path);
}

export function fastang(): Plugin {
  return {
    name: 'fastang',
    enforce: 'pre',
    transform(_code, id, options) {
      if (!options?.ssr && isServerModule(id)) this.error(`Modulo server importato nel client: ${id}`);
    },
    async buildStart() { await generate(); },
    configureServer(server) {
      // Full reload per cambiamenti della struttura; HMR Angular per i componenti.
      let pending = Promise.resolve();
      const update = (file: string) => {
        if (!/src\/(app\/pages|server\/api)\/.*\.ts$/.test(file.replaceAll('\\', '/'))) return;
        pending = pending.then(() => generate()).then(() => {
          server.ws.send({ type: 'full-reload' });
        }).catch((error: unknown) => server.config.logger.error(String(error)));
      };
      server.watcher.on('add', update).on('unlink', update);
    },
  };
}
