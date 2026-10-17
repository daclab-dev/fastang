import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

export interface HttpServerOptions {
  logger?: FastifyServerOptions['logger'];
  configure?: (app: FastifyInstance) => Promise<void> | void;
}

export async function createHttpServer(options: HttpServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 1024 * 1024 });
  try {
    await options.configure?.(app);
    app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Not found' }));
    app.setErrorHandler((error, request, reply) => {
      request.log.error(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : 500;
      const status = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 ? statusCode : 500;
      reply.code(status).send({ error: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : 'Bad request' });
    });
    return app;
  } catch (error) { await app.close(); throw error; }
}
