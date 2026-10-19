import { staticFile } from './static-path.ts';
export { staticFile } from './static-path.ts';
import { createHttpServer } from './http-server.ts';
import { type FastifyInstance, type FastifyServerOptions, type HTTPMethods } from 'fastify';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { RenderContext } from './render-context.ts';
import { withAbort } from './abort.ts';
import { normalizeRedirectLocation } from './redirect.ts';

export type Renderer = (url: string, document: string, context: RenderContext) => Promise<string>;
export interface ServerOptions {
  registerApi?: (app: FastifyInstance) => void;
  logger?: FastifyServerOptions['logger'];
  /** Total template + SSR deadline in milliseconds. Default: 30000. */
  renderTimeoutMs?: number;
  render: Renderer;
  template: (url: string, signal?: AbortSignal) => Promise<string>;
  clientDir?: string;
  prerendered?: string[];
  configure?: (app: FastifyInstance) => Promise<void> | void;
}


export async function createApiServer(options: Pick<ServerOptions, 'logger' | 'configure' | 'registerApi'> = {}): Promise<FastifyInstance> {
  return createHttpServer({
    ...options,
    configure: async (app) => {
      await options.configure?.(app);
      options.registerApi?.(app);
    },
  });
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const timeoutMs = options.renderTimeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) {
    throw new Error('renderTimeoutMs must be an integer between 1 and 2147483647');
  }
  const app = await createApiServer(options);
  const active = new Set<AbortController>();
  app.addHook('preClose', async () => {
    for (const controller of active) controller.abort(new Error('SSR server shutting down'));
  });
  try {
    if (options.clientDir) {
      // Vercel serves assets through its CDN and must not initialize the static
      // plugin (or its require(ESM) dependency chain) in the SSR function.
      const { default: fastifyStatic } = await import('@fastify/static');
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
      const controller = new AbortController();
      const { signal } = controller;
      active.add(controller);
      const timeoutReason = new Error('SSR deadline exceeded');
      const timer = setTimeout(() => controller.abort(timeoutReason), timeoutMs);
      timer.unref();
      const disconnected = () => {
        if (!reply.raw.writableFinished) controller.abort(new Error('SSR client disconnected'));
      };
      reply.raw.on('close', disconnected);
      try {
        const responseCookies: string[] = [];
        const context: RenderContext = {
          status: 200,
          signal,
          async dispatchApi(path, method, body, headers, dispatchOptions = {}) {
            const dispatchSignal = dispatchOptions.signal ? AbortSignal.any([signal, dispatchOptions.signal]) : signal;
            dispatchSignal.throwIfAborted();
            path = normalizeRedirectLocation(path);
            if (!path.startsWith('/api/')) throw new Error('Only local API paths are allowed');
            const forwarded: Record<string, string> = {};
            for (const name of ['cookie', 'authorization', 'x-request-label']) {
              const value = request.headers[name];
              if (typeof value === 'string') forwarded[name] = value;
            }
            const outgoing: Record<string, string> = { ...forwarded, ...(body == null ? {} : { 'content-type': 'application/json' }), ...Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])) };
            const response = await withAbort(app.inject({
              signal: dispatchSignal,
              method: method as HTTPMethods, url: path,
              headers: outgoing,
              ...(body == null ? {} : { payload: typeof body === 'string' ? body : JSON.stringify(body) }),
            }), dispatchSignal);
            dispatchSignal.throwIfAborted();
            const responseHeaders: Record<string, string | string[]> = {};
            for (const [name, value] of Object.entries(response.headers)) {
              if (value !== undefined) responseHeaders[name] = Array.isArray(value) ? [...value] : String(value);
            }
            if (dispatchOptions.forwardSetCookie === true) {
              const cookies = responseHeaders['set-cookie'];
              if (cookies) responseCookies.push(...(Array.isArray(cookies) ? cookies : [cookies]));
            }
            const contentType = String(response.headers['content-type'] ?? '');
            return { status: response.statusCode, body: contentType.includes('json') ? response.json() : response.body, headers: responseHeaders, credentialed: !!(outgoing['cookie'] || outgoing['authorization']) };
          },
        };
        const document = await withAbort(options.template(request.url, signal), signal);
        signal.throwIfAborted();
        const html = await withAbort(options.render(`http://fastang.local${request.url}`, document, context), signal);
        signal.throwIfAborted();
        if (context.redirect) {
          const status = context.redirect.status ?? 302;
          if (![301, 302, 303, 307, 308].includes(status)) throw new Error('Invalid redirect status');
          const location = normalizeRedirectLocation(context.redirect.location);
          if (responseCookies.length) reply.header('set-cookie', responseCookies);
          return reply.header('x-fastang-render', 'redirect').header('cache-control', 'private, no-store')
            .redirect(location, status);
        }
        if (responseCookies.length) reply.header('set-cookie', responseCookies);
        return reply.code(context.status).header('x-fastang-render', 'ssr').header('cache-control', 'private, no-store').type('text/html; charset=utf-8').send(html);
      } catch (error) {
        if (!signal.aborted) throw error;
        if (reply.raw.destroyed) return reply;
        return reply.code(signal.reason === timeoutReason ? 504 : 503)
          .header('cache-control', 'private, no-store')
          .send({ error: signal.reason === timeoutReason ? 'SSR rendering timed out' : 'SSR rendering cancelled' });
      } finally {
        clearTimeout(timer);
        reply.raw.removeListener('close', disconnected);
        active.delete(controller);
      }
    });
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
