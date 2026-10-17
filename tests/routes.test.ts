import test from 'node:test';
import assert from 'node:assert/strict';
import { fileRoute, sortAndValidate, generate, buildPageTree } from '../framework/routes';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('converte index, parametri, gruppi e catch-all', () => {
  assert.equal(fileRoute('index.page.ts', 'page').path, '');
  assert.equal(fileRoute('(shop)/products/[id].page.ts', 'page').path, 'products/:id');
  assert.equal(fileRoute('products.[id].page.ts', 'page').path, 'products/:id');
  assert.equal(fileRoute('docs/[...slug].page.ts', 'page').path, 'docs/**');
  assert.deepEqual(fileRoute('products/[id].get.ts', 'api'), { file: 'products/[id].get.ts', path: 'products/:id', method: 'GET' });
  assert.throws(() => fileRoute('[...slug]/edit.page.ts', 'page'), /Catch-all/);
  assert.throws(() => fileRoute('[id]/[id].page.ts', 'page'), /duplicato/);
  assert.throws(() => fileRoute('users.ts', 'api'), /metodo/);
});

test('le rotte statiche precedono parametri e catch-all, le collisioni falliscono', () => {
  const files = ['[...slug].page.ts', 'products/[id].page.ts', 'products/new.page.ts'];
  assert.deepEqual(sortAndValidate(files.map((file) => fileRoute(file, 'page'))).map((route) => route.path), ['products/new', 'products/:id', '**']);
  assert.throws(() => sortAndValidate(['users/[id].page.ts', 'users/[name].page.ts'].map((file) => fileRoute(file, 'page'))), /Collisione/);
  assert.throws(() => sortAndValidate(['about.page.ts', '(public)/about.page.ts'].map((file) => fileRoute(file, 'page'))), /Collisione/);
  assert.doesNotThrow(() => sortAndValidate(['users.get.ts', 'users.post.ts'].map((file) => fileRoute(file, 'api'))));
});

test('la generazione rimuove le route eliminate e ignora gli helper API', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fastang-routes-'));
  try {
    await mkdir(join(root, 'src/app/pages'), { recursive: true });
    await mkdir(join(root, 'src/server/api'), { recursive: true });
    await writeFile(join(root, 'src/app/pages/index.page.ts'), '');
    await writeFile(join(root, 'src/app/pages/about.page.ts'), '');
    await writeFile(join(root, 'src/server/api/health.get.ts'), '');
    await writeFile(join(root, 'src/server/api/helper.ts'), '');
    await generate(root);
    assert.match(await readFile(join(root, 'src/app/fastang.routes.ts'), 'utf8'), /about/);
    assert.doesNotMatch(await readFile(join(root, '.fastang/api.ts'), 'utf8'), /helper/);
    await rm(join(root, 'src/app/pages/about.page.ts'));
    await generate(root);
    assert.doesNotMatch(await readFile(join(root, 'src/app/fastang.routes.ts'), 'utf8'), /about/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('layout globali, di sezione e gruppi pathless formano route Angular annidate', () => {
  const tree = buildPageTree([
    'layout.ts', 'layout.route.ts', 'index.page.ts', 'index.route.ts',
    'products/layout.ts', 'products/layout.route.ts',
    'products/(details)/layout.ts', 'products/(details)/[id].page.ts', 'products/(details)/[id].route.ts',
    '[...slug].page.ts',
  ]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].path, '');
  assert.equal(tree[0].metadata, 'layout.route.ts');
  const products = tree[0].children!.find((node) => node.path === 'products')!;
  assert.equal(products.kind, 'layout');
  assert.equal(products.children![0].path, '');
  const item = products.children![0].children![0];
  assert.equal(item.path, ':id');
  assert.equal(item.fullPath, 'products/:id');
  assert.equal(item.metadata, 'products/(details)/[id].route.ts');
  assert.equal(tree[0].children!.at(-1)!.path, '**');
});

test('un layout parametrico consuma solo i parametri del proprio segmento', () => {
  const tree = buildPageTree([
    'teams/[team]/layout.ts', 'teams/[team]/index.page.ts', 'teams/[team]/members/[id].page.ts',
  ]);
  assert.equal(tree[0].path, 'teams/:team');
  assert.deepEqual(tree[0].children!.map((node) => node.path).sort(), ['', 'members/:id']);
});

test('un ramo layout non nasconde le rotte statiche più specifiche', () => {
  const tree = buildPageTree(['products/layout.ts', 'products/[id].page.ts', 'products.new.page.ts']);
  assert.deepEqual(tree.map((node) => node.path), ['products/new', 'products']);
  assert.throws(() => buildPageTree([
    '(group)/layout.ts', '(group)/about.page.ts', '(group)/[...slug].page.ts', 'contact.page.ts',
  ]), /Ordine ambiguo/);
});

test('la generazione rifiuta metadati orfani, collisioni e layout catch-all', () => {
  assert.throws(() => buildPageTree(['missing.route.ts']), /Metadati senza/);
  assert.throws(() => buildPageTree(['layout.page.ts']), /riservato/);
  assert.throws(() => buildPageTree(['[...slug]/layout.ts']), /Layout sotto catch-all/);
  assert.throws(() => buildPageTree(['(one)/layout.ts', '(one)/about.page.ts', '(two)/about.page.ts']), /Collisione/);
  assert.deepEqual(buildPageTree(['empty/layout.ts', 'index.page.ts']).map((node) => node.path), ['']);
});

test('SSR route pruning keeps ancestors and 404s while retaining redirect metadata', async () => {
  const { pageRoutesSource, renderedPageFiles } = await import('../framework/routes');
  const tree = buildPageTree([
    'index.page.ts', 'index.route.ts', 'author.page.ts', 'author.route.ts',
    'products/layout.ts', 'products/layout.route.ts', 'products/(detail)/layout.ts',
    'products/(detail)/[id].page.ts', 'products/(detail)/[id].route.ts', '[...slug].page.ts',
  ]);
  const source = pageRoutesSource(tree, { pagesImport: './pages/', selectedFile: 'products/(detail)/[id].page.ts', omittedImport: './omitted.server' });
  assert.deepEqual(new Set(renderedPageFiles(tree, 'products/(detail)/[id].page.ts')), new Set([
    'products/layout.ts', 'products/(detail)/layout.ts', 'products/(detail)/[id].page.ts', '[...slug].page.ts',
  ]));
  assert.match(source, /import\("\.\/pages\/products\/\(detail\)\/\[id\]\.page"\)/);
  assert.doesNotMatch(source, /import\("\.\/pages\/author\.page"\)/);
  assert.match(source, /from "\.\/pages\/author\.route"/);
  assert.match(source, /import\("\.\/omitted.server"\)/);
  assert.match(source, /import\("\.\/pages\/\[\.\.\.slug\]\.page"\)/);
});
