import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '@fastang/core/server';
import { render } from '../main.server';
import { configureServer } from './plugins';
import { guideNavigation } from '../app/docs/navigation';
import { registerApi } from '../../.fastang/api';

const directory = dirname(fileURLToPath(import.meta.url));
export async function createProductionServer(options: { prerender?: boolean; logger?: boolean; serveAssets?: boolean } = {}) {
  const clientDir = resolve(directory, '../client');
  const document = await readFile(resolve(clientDir, 'index.html'), 'utf8');
  const prerendered: string[] = options.prerender === false ? [] : JSON.parse(await readFile(resolve(directory, '../prerender.json'), 'utf8'));
  return createServer({
    logger: options.logger ?? false,
    clientDir: options.serveAssets === false ? undefined : clientDir, prerendered,
    template: async () => document, render,
    configure: async app => {
      await configureServer(app);
      if (options.serveAssets === false) return;
      const paths = ['/llms.txt', '/llms-full.txt', ...['/docs', '/en/docs'].flatMap(prefix =>
        guideNavigation.map(guide => `${prefix}/${guide.slug}.md`))];
      for (const path of paths) {
        app.get(path, async (_request, reply) => reply
          .type(path.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8')
          .header('link', '</llms.txt>; rel="describedby"')
          .send(await readFile(resolve(clientDir, path.slice(1)), 'utf8')));
      }
    },
    registerApi,
  });
}
