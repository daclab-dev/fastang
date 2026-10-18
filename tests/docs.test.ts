import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { parseMarkdown, inline } from '../src/app/docs/markdown';
import { guideNavigation } from '../src/app/docs/navigation';

test('bilingual guides have matching executable examples and valid internal links', async () => {
  for (const language of ['it', 'en']) {
    assert.deepEqual((await readdir(`docs/guide/${language}`)).sort(), guideNavigation.map(guide => guide.slug + '.md').sort());
  }
  for (const guide of guideNavigation) {
    const articles = await Promise.all(['it', 'en'].map(async language => parseMarkdown(await readFile(`docs/guide/${language}/${guide.slug}.md`, 'utf8'))));
    const snippets = (article: typeof articles[number]) => article.blocks.filter(block => block.kind === 'code').map(({ language, file, text }) => ({ language, file, text }));
    assert.deepEqual(snippets(articles[0]), snippets(articles[1]), `${guide.slug}: translated guides must use the same tested code`);
    for (const article of articles) {
      assert.ok(article.sections.length >= 3);
      for (const block of article.blocks) {
        const texts = block.kind === 'paragraph' ? [block.text] : block.kind === 'list' ? block.items : [];
        for (const text of texts) for (const token of inline(text)) {
          if (token.kind === 'link' && token.href?.endsWith('.md')) assert.ok(guideNavigation.some(guide => guide.slug + '.md' === token.href));
        }
      }
    }
  }
});

test('guide rendering preserves code as text and rejects unsafe link targets', () => {
  const article = parseMarkdown('# Guide\n\n## Step\n\n```html\n<script>alert(1)</script>\n```\n\n## Step\n');
  assert.deepEqual(article.sections.map(section => section.id), ['step', 'step-2']);
  assert.equal(article.blocks.find(block => block.kind === 'code')?.text, '<script>alert(1)</script>');
  assert.ok(!inline('[bad](javascript:alert) [bad](//example.com)').some(token => token.kind === 'link'));
  assert.throws(() => parseMarkdown('# Guide\n```ts\nconst missing = true;'), /Unclosed/);
});

test('public reference tables match package exports, Node engines and peer ranges in both languages', async () => {
  const manifest = JSON.parse(await readFile('packages/core/package.json', 'utf8'));
  const expectedImports = Object.keys(manifest.exports).map(key => '@fastang/core' + (key === '.' ? '' : key.slice(1))).sort();
  const expectedVersions = { 'Node.js': manifest.engines.node.replaceAll(' || ', ' / '), ...manifest.peerDependencies };
  const plain = (value: string) => value.replaceAll('`', '');
  for (const language of ['it', 'en']) {
    const article = parseMarkdown(await readFile(`docs/guide/${language}/reference.md`, 'utf8'));
    const tables = article.blocks.filter(block => block.kind === 'table');
    const imports = tables.find(table => table.rows.some(row => plain(row[0]) === '@fastang/core'));
    assert.ok(imports, `${language}: missing public entry point table`);
    assert.deepEqual(imports.rows.map(row => plain(row[0])).sort(), expectedImports, `${language}: undocumented or obsolete npm exports`);
    const versions = tables.find(table => table.rows.some(row => row[0] === 'Node.js'));
    assert.ok(versions, `${language}: missing dependency matrix`);
    assert.deepEqual(Object.fromEntries(versions.rows.map(row => [plain(row[0]), plain(row[1])])), expectedVersions, `${language}: environment matrix differs from package declarations`);
  }
});
