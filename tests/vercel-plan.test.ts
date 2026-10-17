import test from 'node:test';
import assert from 'node:assert/strict';
import { fileRoute, sortAndValidate } from '../framework/routes';
import { planVercelFunctions, routePattern } from '../framework/adapters/vercel-plan';

const pages = sortAndValidate(['index.page.ts', 'about.page.ts', 'products/[id].page.ts', '[...slug].page.ts'].map((file) => fileRoute(file, 'page')));
const apis = sortAndValidate(['health.get.ts', 'products/[id].get.ts', 'products/[name].post.ts', 'products/[id].head.ts'].map((file) => fileRoute(file, 'api')));

test('Vercel routes group locales and API methods, excluding static pages and catch-alls', () => {
  const plan = planVercelFunctions(pages, apis, ['/about', '/en/about'], { functions: 'routes', pagePrefixes: ['', '/en'] });
  assert.equal(plan.functions.filter((fn) => fn.kind === 'ssr').length, 3, 'Home, product and SSR fallback');
  const home = plan.functions.find((fn) => fn.paths.includes('/'))!;
  assert.deepEqual(home.paths, ['/', '/en']);
  assert.ok(!plan.functions.some((fn) => fn.paths.includes('/about')));
  assert.ok(!plan.functions.some((fn) => fn.paths.some((path) => path.includes('**'))));
  const productApi = plan.functions.find((fn) => fn.paths.includes('/api/products/:id'))!;
  assert.equal(productApi.sources.length, 3, 'Same URL shape shares one function across methods and parameter names');
  assert.equal(new Set(plan.functions.map((fn) => fn.name)).size, plan.functions.length);
  const partial = planVercelFunctions(pages, apis, ['/about'], { functions: 'routes', pagePrefixes: ['', '/en'] });
  assert.deepEqual(partial.functions.find((fn) => fn.paths.includes('/en/about'))!.paths, ['/en/about']);
});

test('Vercel route patterns keep dynamic segments bounded and match root aliases', () => {
  const product = new RegExp(routePattern('/en/products/:id'));
  assert.ok(product.test('/en/products/starter'));
  assert.ok(product.test('/en/products/a%20b/'));
  assert.ok(!product.test('/en/products/a/b'));
  assert.ok(!product.test('/en/products/'));
  assert.ok(new RegExp(routePattern('/')).test('/'));
  assert.ok(!new RegExp(routePattern('/')).test('/else'));
  assert.ok(new RegExp(routePattern('/en')).test('/en/'));
});

test('Vercel keeps shared mode and rejects ambiguous or unsafe deployment prefixes', () => {
  assert.equal(planVercelFunctions(pages, apis, []).functions.length, 2);
  for (const pagePrefixes of [[], ['en'], ['/en/'], ['/../en'], ['/api'], ['/assets'], ['/__fastang']]) {
    assert.throws(() => planVercelFunctions(pages, apis, [], { functions: 'routes', pagePrefixes }));
  }
  const aliases = ['index.page.ts', 'en.page.ts'].map((file) => fileRoute(file, 'page'));
  assert.throws(() => planVercelFunctions(aliases, [], [], { functions: 'routes', pagePrefixes: ['', '/en'] }), /Overlapping/);
});

test('internal function paths cannot shadow public api or ssr routes', () => {
  const plan = planVercelFunctions([fileRoute('ssr.page.ts', 'page')], [fileRoute('index.get.ts', 'api')], [], { functions: 'routes' });
  const publicPaths = new Set(plan.functions.flatMap((fn) => fn.paths));
  for (const fn of plan.functions) assert.ok(!publicPaths.has('/' + fn.name));
  assert.ok(plan.functions.some((fn) => fn.paths.includes('/api')));
  assert.ok(plan.functions.some((fn) => fn.paths.includes('/ssr')));
});
