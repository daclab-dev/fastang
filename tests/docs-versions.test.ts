import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { CURRENT_DOCS_VERSION, documentationLocation, documentationPath, documentationVersions, switchDocumentation } from '../src/app/docs/versions';
test('documentation navigation keeps release identity and falls back only on an explicit version switch', () => {
  const current = documentationVersions[0];
  const previous = documentationVersions.find(version => version.version === '0.1.0-alpha.1')!;
  assert.equal(current.version, CURRENT_DOCS_VERSION);
  assert.equal(documentationLocation('/en/docs/api').version, current);
  const old = documentationLocation('/en' + documentationPath(previous, 'api') + '?x=1#hooks');
  assert.equal(old.version, previous);
  assert.equal(old.slug, 'api');
  assert.equal(switchDocumentation('/en/docs/api', previous), documentationPath(previous, 'api'));
  assert.equal(switchDocumentation('/docs/typed-api', previous), documentationPath(previous));
  assert.equal(documentationLocation('/docs/v/unknown/api').version, undefined);
  assert.equal(documentationLocation('/docs/v/unknown').version, undefined);
  assert.equal(documentationLocation('/docs/v/0-1-0-alpha-2/api/extra').version, undefined);
  assert.equal(new Set(documentationVersions.map(version => version.slug)).size, documentationVersions.length);
});
test('archived documentation and navigation match their recorded Git source', async () => {
  assert.equal(JSON.parse(await readFile('packages/core/package.json', 'utf8')).version, CURRENT_DOCS_VERSION);
  for (const version of documentationVersions.filter(version => version.ref !== 'main')) {
    const metadata = JSON.parse(await readFile(`docs/versions/${version.version}/release.json`, 'utf8'));
    assert.equal(metadata.ref, version.ref);
    for (const language of ['it', 'en']) {
      const directory = `docs/versions/${version.version}/${language}`;
      assert.deepEqual((await readdir(directory)).sort(), version.guides.map(guide => guide.slug + '.md').sort());
      for (const guide of version.guides) {
        const archived = await readFile(`${directory}/${guide.slug}.md`, 'utf8');
        assert.equal(createHash('sha256').update(archived).digest('hex'), metadata.sha256[`${language}/${guide.slug}.md`]);
      }
    }
    assert.equal(createHash('sha256').update(await readFile(`docs/versions/${version.version}/navigation.ts`)).digest('hex'), metadata.sha256['navigation.ts']);
  }
});
