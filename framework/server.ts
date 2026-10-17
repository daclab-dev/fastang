import { createHttpServer } from './http-server';
import { type FastifyInstance, type FastifyServerOptions, type HTTPMethods } from 'fastify';
import fastifyStatic from '@fastify/static';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { registerApi } from '../.fastang/api';
import type { RenderContext } from '../src/shared/render-context';
import { normalizeRedirectLocation } from './redirect';

export type Renderer = (url: string, document: string, context: RenderContext) => Promise<string>;
export interface ServerOptions {
  logger?: FastifyServerOptions['logger'];
  render: Renderer;
  template: (url: string) => Promise<string>;
  clientDir?: string;
  prerendered?: string[];
  configure?: (app: FastifyInstance) => Promise<void> | void;
}

export function staticFile(path: string): string {
  if (!path.startsWith('/') || path.includes('//') || !/^\/[a-zA-Z0-9_/-]*$/.test(path) || path.split('/').includes('..')) {
    throw new Error(`Percorso di prerendering non supportato: ${path}`);
  }
  return `${path.replace(/^\/|\/$/g, '')}${path === '/' ? '' : '/'}index.html`;
}

export async function createApiServer(options: Pick<ServerOptions, 'logger' | 'configure'> = {}): Promise<FastifyInstance> {
  return createHttpServer({
    ...options,
    configure: async (app) => {
      await options.configure?.(app);
      registerApi(app);
    },
  });
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = await createApiServer(options);
  try {
    if (options.clientDir) {
      await app.register(fastifyStatic, {
        root: resolve(options.clientDir, 'assets'), prefix: '/assets/',
        immutable: true, maxAge: '1y', decorateReply: false,
      });
    }
    const prerendered = new Map((options.prerendered ?? []).map((path) => [path, staticFile(path)]));
    app.get('/*', async (request, reply) => {
      const pathname = new URL(request.url, 'http://fastang.local').pathname;
      // Le API inesistenti e gli asset mancanti non devono diventare pagine HTML.
      if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/assets/') || extname(pathname)) {
        return reply.code(404).send({ error: 'Not found' });
      }
      const staticPath = prerendered.get(pathname);
      if (staticPath && options.clientDir) {
        const html = await readFile(resolve(options.clientDir, staticPath), 'utf8');
        return reply.header('x-fastang-render', 'prerender').header('cache-control', 'public, max-age=0, must-revalidate').type('text/html; charset=utf-8').send(html);
      }
      const context: RenderContext = {
        status: 200,
        async dispatchApi(path, method, body, headers) {
          if (!path.startsWith('/api/')) throw new Error('Solo API locali consentite');
          const forwarded: Record<string, string> = {};
          for (const name of ['cookie', 'authorization', 'x-request-label']) {
            const value = request.headers[name];
            if (typeof value === 'string') forwarded[name] = value;
          }
          const response = await app.inject({
            method: method as HTTPMethods, url: path,
            headers: { ...forwarded, ...(body == null ? {} : { 'content-type': 'application/json' }), ...headers },
            ...(body == null ? {} : { payload: typeof body === 'string' ? body : JSON.stringify(body) }),
          });
          const responseHeaders: Record<string, string> = {};
          for (const [name, value] of Object.entries(response.headers)) {
            if (value !== undefined) responseHeaders[name] = Array.isArray(value) ? value.join(', ') : String(value);
          }
          const contentType = String(response.headers['content-type'] ?? '');
          return { status: response.statusCode, body: contentType.includes('json') ? response.json() : response.body, headers: responseHeaders };
        },
      };
      const html = await options.render(`http://fastang.local${request.url}`, await options.template(request.url), context);
      if (context.redirect) {
        const status = context.redirect.status ?? 302;
        if (![301, 302, 303, 307, 308].includes(status)) throw new Error('Stato redirect non valido');
        return reply.header('x-fastang-render', 'redirect').header('cache-control', 'private, no-store')
          .redirect(normalizeRedirectLocation(context.redirect.location), status);
      }
      return reply.code(context.status).header('x-fastang-render', 'ssr').header('cache-control', 'private, no-store').type('text/html; charset=utf-8').send(html);
    });
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
