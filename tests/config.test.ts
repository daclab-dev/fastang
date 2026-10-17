import test from 'node:test';
import assert from 'node:assert/strict';
import { defineConfig, validateConfig } from '@fastang/core/config';
import { planVercelFunctions } from '@fastang/core/adapters/vercel-plan';

test('configuration preserves valid settings and accepts an empty prerender list', () => {
  const config = { prerender: ['/about', '/about', '/en/about/'], vercel: { functions: 'routes' as const, pagePrefixes: ['', '/en'], prunePages: false } };
  assert.equal(defineConfig(config), config);
  assert.deepEqual(validateConfig({ prerender: [] }), { prerender: [] });
});

test('configuration rejects malformed exports and misspelled options', () => {
  for (const value of [null, [], 'config', {}, { prerender: '/about' }, { prerender: [], rendering: 'ssr' }]) assert.throws(() => validateConfig(value));
  for (const path of [null, 5, {}, '/', '/api', '/api/foo', '/assets', '/__fastang/foo', 'about', '//about', '/a/../b', '/about?q=1', '/a#b', '/a%2fb', '/a\\b']) {
    assert.throws(() => validateConfig({ prerender: [path] }), /prerender/i);
  }
  assert.throws(() => validateConfig({ prerender: ['/about', '/about/'] }), /Conflicting prerender paths/);
});

test('Vercel options are validated in both configs and direct adapter calls', () => {
  for (const vercel of [null, [], { functions: 'route' }, { prunePages: 'false' }, { pagePrefixes: '/en' }, { pagePrefixes: [null] }, { pagePrefixes: [] }, { pagePrefixes: ['/api'] }, { prunePage: true }]) {
    assert.throws(() => validateConfig({ prerender: [], vercel }), /vercel/i);
    assert.throws(() => planVercelFunctions([], [], [], vercel as never));
  }
});
