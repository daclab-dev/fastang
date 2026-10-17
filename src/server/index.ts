import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '@fastang/core/server';
import { render } from '../main.server';
import { configureServer } from './plugins';
import { registerApi } from '../../.fastang/api';

const directory = dirname(fileURLToPath(import.meta.url));
export async function createProductionServer(options: { prerender?: boolean; logger?: boolean; serveAssets?: boolean } = {}) {
  const clientDir = resolve(directory, '../client');
  const document = await readFile(resolve(clientDir, 'index.html'), 'utf8');
  const prerendered: string[] = options.prerender === false ? [] : JSON.parse(await readFile(resolve(directory, '../prerender.json'), 'utf8'));
  return createServer({
    logger: options.logger ?? false,
    clientDir: options.serveAssets === false ? undefined : clientDir, prerendered,
    template: async () => document, render, configure: configureServer, registerApi,
  });
}
