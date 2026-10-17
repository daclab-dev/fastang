import type { FastifyInstance } from 'fastify';

/** FAST on a telephone keypad. PORT can override this local convention. */
export const DEFAULT_PORT = 3278;

export async function listen(app: FastifyInstance): Promise<void> {
  const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
  const host = process.env['HOST'] ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT deve essere una porta valida');
  const shutdown = async () => {
    try { await app.close(); }
    catch (error) { app.log.error(error); process.exitCode = 1; }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  app.addHook('onClose', async () => {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
  });
  try { await app.listen({ port, host }); }
  catch (error) { await app.close(); throw error; }
}
