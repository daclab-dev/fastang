import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CURRENT_DOCS_VERSION, documentationLocation, documentationPath, documentationVersions, switchDocumentation } from '../src/app/docs/versions';
test('pre-v1 documentation exposes only current guides while preserving versioned navigation', async () => {
  const [current] = documentationVersions;
  assert.equal(documentationVersions.length, 1);
  assert.equal(current.version, CURRENT_DOCS_VERSION);
  assert.equal(JSON.parse(await readFile('packages/core/package.json', 'utf8')).version, CURRENT_DOCS_VERSION);
  assert.equal(documentationLocation('/en/docs/api').version, current);
  assert.equal(documentationLocation('/en' + documentationPath(current, 'api') + '?x=1#hooks').version, current);
  assert.equal(switchDocumentation('/en/docs/api', current), documentationPath(current, 'api'));
  assert.equal(switchDocumentation('/docs/missing', current), documentationPath(current));
  for (const url of ['/docs/v/unknown', '/docs/v/unknown/api', '/docs/v/0-1-0-alpha-1/api', '/docs/v/0-1-0-alpha-2/api', documentationPath(current, 'api') + '/extra']) {
    assert.equal(documentationLocation(url).version, undefined);
  }
});
