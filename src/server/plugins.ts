import type { FastifyInstance } from 'fastify';

// Registra qui i plugin della tua applicazione: cookie, auth, database, ecc.
export async function configureServer(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    return payload;
  });
}
