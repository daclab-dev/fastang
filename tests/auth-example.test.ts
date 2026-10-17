import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createHttpServer } from '@fastang/core/http-server';
import { configureServer } from '../examples/auth/src/server/plugins';

async function server(origin = 'http://localhost:3278') {
  const previous = { ...process.env };
  const password = randomBytes(24).toString('hex');
  Object.assign(process.env, { AUTH_SESSION_KEY: randomBytes(32).toString('hex'), AUTH_DEMO_PASSWORD: password, AUTH_ORIGIN: origin });
  try { return { app: await createHttpServer({ configure: configureServer }), password }; }
  finally {
    for (const key of ['AUTH_SESSION_KEY', 'AUTH_DEMO_PASSWORD', 'AUTH_ORIGIN']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
}

test('auth example rejects CSRF, invalid credentials and tampering, and expires the logout cookie', async () => {
  const { app, password } = await server();
  const origin = 'http://localhost:3278';
  try {
    assert.equal((await app.inject('/api/auth/session')).statusCode, 401);
    for (const value of [undefined, 'null', 'https://evil.example']) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers: value ? { origin: value } : {}, payload: { password } });
      assert.equal(response.statusCode, 403);
      assert.equal(response.headers['set-cookie'], undefined);
    }
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin }, payload: { password: 'incorrect' } })).statusCode, 401);
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin }, payload: { password } });
    assert.equal(login.statusCode, 200);
    const raw = String(login.headers['set-cookie']);
    assert.match(raw, /HttpOnly/i); assert.match(raw, /SameSite=Lax/i);
    assert.ok(!raw.includes(password));
    const cookie = raw.split(';')[0];
    const session = await app.inject({ url: '/api/auth/session', headers: { cookie } });
    assert.equal(session.headers['cache-control'], 'private, no-store');
    assert.deepEqual(session.json(), { user: { name: 'Demo user' } });
    assert.equal((await app.inject({ url: '/api/auth/session', headers: { cookie: 'fastang-session=invalid' } })).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { origin: 'https://evil.example', cookie } })).statusCode, 403);
    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { origin, cookie } });
    assert.equal(logout.statusCode, 200);
    assert.match(String(logout.headers['set-cookie']), /Expires=Thu, 01 Jan 1970/i);
  } finally { await app.close(); }
});

test('auth example sets HTTPS cookie attributes and bounds login attempts', async () => {
  const { app, password } = await server('https://auth.example');
  try {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: 'https://auth.example' }, payload: { password } });
    assert.equal(login.statusCode, 200);
    assert.match(String(login.headers['set-cookie']), /^__Host-fastang-session=/);
    assert.match(String(login.headers['set-cookie']), /; Secure/i);
    for (let i = 0; i < 9; i++) await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: 'https://auth.example' }, payload: { password: 'wrong' } });
    const limited = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: 'https://auth.example' }, payload: { password } });
    assert.equal(limited.statusCode, 429);
  } finally { await app.close(); }
});
