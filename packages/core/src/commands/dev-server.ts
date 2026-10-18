import { readFile } from 'node:fs/promises';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import middie from '@fastify/middie';
import { createServer, type Renderer } from '../server.ts';
import { listen } from '../listen.ts';
import { tsImport } from 'tsx/esm/api';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { developmentLogging } from './dev-logging.ts';
import { loadFastangConfig } from './load-config.ts';

const logging = developmentLogging();
await loadFastangConfig('serve');

const { configureServer } = await tsImport(pathToFileURL(resolve('src/server/plugins.ts')).href, import.meta.url);
const { registerApi } = await tsImport(pathToFileURL(resolve('.fastang/api.ts')).href, import.meta.url);

let vite: ViteDevServer | undefined;
try {
  const app = await createServer({
    logger: { level: logging.level }, registerApi,
    async configure(server) {
      vite = await createViteServer({ logLevel: logging.vite, server: { middlewareMode: true, hmr: { server: server.server } }, appType: 'custom' });
      server.addHook('onClose', async () => { await vite?.close(); });
      await server.register(middie);
      // Middie gestisce next(), risposte completate ed errori del middleware Connect.
      server.use(vite.middlewares);
      await configureServer(server);
    },
    async template(url) { return vite!.transformIndexHtml(url, await readFile('index.html', 'utf8')); },
    async render(url, document, context) {
      try {
        const module = await vite!.ssrLoadModule('/src/main.server.ts');
        return await (module['render'] as Renderer)(url, document, context);
      } catch (error) {
        if (error instanceof Error) vite!.ssrFixStacktrace(error);
        throw error;
      }
    },
  });
  await listen(app);
  if (logging.banner) {
    const address = app.server.address();
    if (address && typeof address !== 'string') {
      const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
      console.log(`Server listening at http://${host}:${address.port}`);
    }
  }
} catch (error) { await vite?.close(); throw error; }
