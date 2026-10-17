import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import secureSession from '@fastify/secure-session';
import rateLimit from '@fastify/rate-limit';

declare module '@fastify/secure-session' {
  interface SessionData { user: { name: string } }
}

/** A single-account demo. Replace credential verification with your identity provider. */
export async function configureServer(app: FastifyInstance): Promise<void> {
  const key = process.env['AUTH_SESSION_KEY'] ?? '';
  const password = process.env['AUTH_DEMO_PASSWORD'] ?? '';
  const origin = new URL(process.env['AUTH_ORIGIN'] ?? '');
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('AUTH_SESSION_KEY must be a 32-byte hexadecimal key');
  if (password.length < 16 || password.length > 1024) throw new Error('AUTH_DEMO_PASSWORD must contain 16 to 1024 characters');
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('AUTH_ORIGIN must be an HTTP(S) origin');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.protocol !== 'https:' && !local) throw new Error('AUTH_ORIGIN must use HTTPS outside loopback development');
  const secure = origin.protocol === 'https:';
  await app.register(secureSession, {
    key: Buffer.from(key, 'hex'), expiry: 3600,
    cookieName: secure ? '__Host-fastang-session' : 'fastang-session',
    cookie: { path: '/', httpOnly: true, secure, sameSite: 'lax', maxAge: 3600 },
  });
  await app.register(rateLimit, { global: false });
  // Origin validation protects both login and logout, including login CSRF.
  app.addHook('onRequest', async (request, reply) => {
    if (new URL(request.url, origin).pathname.startsWith('/api/auth/')) reply.header('cache-control', 'private, no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== origin.origin) {
      return reply.code(403).send({ error: 'Forbidden origin' });
    }
  });
  const digest = (value: string) => createHash('sha256').update(value).digest();
  const expected = digest(password);
  app.post<{ Body: { password: string } }>('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', additionalProperties: false, required: ['password'], properties: { password: { type: 'string', minLength: 1, maxLength: 1024 } } } },
  }, async (request, reply) => {
    if (!timingSafeEqual(expected, digest(request.body.password))) return reply.code(401).send({ error: 'Invalid credentials' });
    request.session.regenerate();
    request.session.set('user', { name: 'Demo user' });
    return { ok: true };
  });
  app.get('/api/auth/session', async (request, reply) => {
    const user = request.session.get('user');
    if (!user) return reply.code(401).send({ error: 'Authentication required' });
    return { user };
  });
  app.post('/api/auth/logout', async request => {
    request.session.delete();
    return { ok: true };
  });
}
