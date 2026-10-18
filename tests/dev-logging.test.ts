import { test } from 'node:test';
import assert from 'node:assert/strict';
import { developmentLogging } from '../packages/core/src/commands/dev-logging.ts';
import { createHttpServer } from '../packages/core/src/http-server.ts';

test('development logs default to warn with an address banner; explicit levels map to Vite', () => {
  const previous = process.env['FASTANG_LOG_LEVEL'];
  delete process.env['FASTANG_LOG_LEVEL'];
  try { assert.deepEqual(developmentLogging(), { level:'warn', vite:'warn', banner:true }); }
  finally { if (previous !== undefined) process.env['FASTANG_LOG_LEVEL'] = previous; }
  assert.deepEqual(developmentLogging('debug'), { level:'debug', vite:'info', banner:false });
  assert.deepEqual(developmentLogging('info'), { level:'info', vite:'info', banner:false });
  assert.deepEqual(developmentLogging('error'), { level:'error', vite:'error', banner:true });
  assert.throws(() => developmentLogging('verbose'), /FASTANG_LOG_LEVEL must/);
});

test('warn logging suppresses routine request logs while retaining warnings and handler errors', async () => {
  let output = '';
  const app = await createHttpServer({ logger:{ level:developmentLogging('warn').level, stream:{ write: (line: string) => { output += line; } } } });
  app.get('/ok', async () => ({ ok:true }));
  app.get('/warning', async request => { request.log.warn('dev-warning-visible'); return { ok:true }; });
  app.get('/failure', async () => { throw new Error('dev-error-visible'); });
  try {
    assert.equal((await app.inject('/ok')).statusCode,200);
    assert.equal((await app.inject('/warning')).statusCode,200);
    assert.equal((await app.inject('/failure')).statusCode,500);
    assert.doesNotMatch(output,/incoming request|request completed/);
    assert.match(output,/dev-warning-visible/);
    assert.match(output,/dev-error-visible/);
  } finally { await app.close(); }
});
