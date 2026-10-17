import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FastifyInstance } from 'fastify';

/** One initialized Fastify instance per warm function, no listening socket. */
export function createNodeHandler(factory: () => Promise<FastifyInstance>) {
  let pending: Promise<FastifyInstance> | undefined;
  const getApp = () => pending ??= Promise.resolve().then(factory).then(async (app) => {
    try { await app.ready(); return app; }
    catch (error) { await app.close(); throw error; }
  }).catch((error) => { pending = undefined; throw error; });

  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    let app: FastifyInstance;
    try { app = await getApp(); }
    catch {
      response.statusCode = 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.setHeader('cache-control', 'private, no-store');
      response.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        response.removeListener('finish', finish);
        response.removeListener('close', finish);
        response.removeListener('error', fail);
      };
      const finish = () => { cleanup(); resolve(); };
      const fail = (error: Error) => { cleanup(); reject(error); };
      response.once('finish', finish);
      response.once('close', finish);
      response.once('error', fail);
      try { app.server.emit('request', request, response); }
      catch (error) { cleanup(); reject(error); }
    });
  };
}
