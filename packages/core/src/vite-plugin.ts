import type { Plugin } from 'vite';
import { generate } from './routes.ts';
import { resolve } from 'node:path';
import { checkRoutes, formatCheck } from './check.ts';

export function isServerModule(id: string): boolean {
  const path = id.replaceAll('\\', '/').split('?')[0];
  return /\/(src\/server|framework|\.fastang)\//.test(path)
    || /\.server\.[cm]?[jt]s$/.test(path)
    || /\/(?:@fastang\/core|packages\/core)\/(?:src|dist)\/(?:index|server|http-server|node-handler|listen|angular|api|contract-route|check|routes|vite|vite-plugin|cli|commands\/.*|adapters\/.*)\.[cm]?[jt]s$/.test(path);
}

export function fastang(): Plugin {
  let root = process.cwd();
  const dependencies = new Set<string>();
  return {
    configResolved(config) { root = config.root; },
    name: 'fastang',
    enforce: 'pre',
    transform(_code, id, options) {
      if (!options?.ssr && isServerModule(id)) this.error(`Server module imported into the client: ${id}`);
    },
    async buildStart() {
      const result = await checkRoutes({ root, onFiles: files => files.forEach(file => dependencies.add(file.replaceAll('\\', '/'))) });
      if (result.diagnostics.some(d => d.severity === 'error')) this.error(formatCheck(result));
      if (result.diagnostics.length) this.warn(formatCheck(result));
      await generate(root);
    },
    configureServer(server) {
      let pending = Promise.resolve();
      let timer: ReturnType<typeof setTimeout>;
      let closed = false;
      const update = (file: string) => {
        const path = file.replaceAll('\\', '/');
        if (!(/src\/(?:server|shared)\/.*\.ts$/.test(path) || /tsconfig[^/]*\.json$/.test(path) || /src\/app\/pages\/.*\.ts$/.test(path) || dependencies.has(path)) || /\/(?:node_modules|dist|\.fastang)\//.test(path) || path.endsWith('/fastang.routes.ts')) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          pending = pending.then(async () => {
            if (closed) return;
            const result = await checkRoutes({ root, onFiles: files => { files.forEach(file => dependencies.add(file.replaceAll('\\', '/'))); server.watcher.add(files); } });
            if (closed) return;
            const message = formatCheck(result);
            if (result.diagnostics.some(d => d.severity === 'error')) {
              server.config.logger.error(message);
              server.ws.send({ type: 'error', err: { message, stack: '', plugin: 'fastang' } });
            } else {
              if (result.diagnostics.length) server.config.logger.warn(message);
              await generate(root);
              server.ws.send({ type: 'full-reload' });
            }
          }).catch((error: unknown) => {
            if (!closed) { const message = String(error); server.config.logger.error(message); server.ws.send({ type: 'error', err: { message, stack: '', plugin: 'fastang' } }); }
          });
        }, 150);
      };
      server.watcher.add([resolve(root, 'src/server'), resolve(root, 'src/shared'), ...dependencies]);
      server.watcher.on('add', update).on('unlink', update).on('change', (file: string) => {
        // Leave Angular page/component HMR to its native plugin.
        if (!/src\/app\//.test(file.replaceAll('\\', '/'))) update(file);
      });
      server.watcher.once('close', () => { closed = true; clearTimeout(timer); });
    },
  };
}
