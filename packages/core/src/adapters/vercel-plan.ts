import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { VercelOptions } from '../config.ts';
import { discover, discoverPageTree, pageRoutesSource, renderedPageFiles, type FileRoute } from '../routes.ts';

export interface FunctionPlan {
  name: string;
  kind: 'api' | 'ssr';
  entry: string;
  paths: string[];
  sources: FileRoute[];
  bundle?: string;
  routesModule?: string;
  renderedComponents?: string[];
}
export interface VercelPlan {
  mode: 'shared' | 'routes';
  functions: FunctionPlan[];
}
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Match an entire route; parameter segments never consume a slash. */
export function routePattern(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return '^/' + segments.map((part) => part.startsWith(':') ? '[^/]+' : part === '*' || part === '**' ? '.*' : escapeRegex(part)).join('/') + (segments.length ? '/?' : '') + '$';
}
const signature = (path: string) => path.replace(/:[^/]+/g, ':param');
function identifier(path: string): string {
  const normalized = signature(path);
  const slug = normalized.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'index';
  return slug + '-' + createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

export function planVercelFunctions(pages: FileRoute[], apis: FileRoute[], prerendered: string[], options: VercelOptions = {}): VercelPlan {
  const mode = options.functions ?? 'shared';
  if (mode !== 'shared' && mode !== 'routes') throw new Error('vercel.functions must be shared or routes');
  const prefixes = [...new Set(options.pagePrefixes ?? [''])];
  if (!prefixes.length || prefixes.some((prefix) => prefix !== '' && !/^\/(?:[\w-]+)(?:\/[\w-]+)*$/.test(prefix))) {
    throw new Error('vercel.pagePrefixes must contain empty or absolute static prefixes without a trailing slash');
  }
  if (prefixes.some((prefix) => /^\/(?:api|assets|__fastang)(?:\/|$)/.test(prefix))) throw new Error('Reserved Vercel page prefix');
  const functions: FunctionPlan[] = [
    { name: mode === 'routes' ? '__fastang/ssr' : 'ssr', kind: 'ssr', entry: 'vercel', paths: [], sources: [] },
    { name: mode === 'routes' ? '__fastang/api' : 'api', kind: 'api', entry: 'api', paths: [], sources: [] },
  ];
  if (mode === 'shared') return { mode, functions };

  // Discovery order is already specific-first. Catch-alls stay with the full router.
  const seen = new Map<string, string>();
  const staticPaths = new Set(prerendered.map((path) => path.replace(/\/$/, '') || '/'));
  for (const page of pages.filter((page) => !page.path.includes('**'))) {
    const paths = prefixes.map((prefix) => prefix + (page.path ? '/' + page.path : '') || '/')
      .filter((path) => !staticPaths.has(path));
    for (const path of paths) {
      if (/^\/(?:api|assets|__fastang)(?:\/|$)/.test(path)) throw new Error(`Reserved page path: ${path}`);
      const key = signature(path);
      if (seen.has(key)) throw new Error(`Overlapping Vercel page aliases: ${seen.get(key)} and ${page.file}`);
      seen.set(key, page.file);
    }
    if (paths.length) functions.push({ name: '__fastang/pages/' + identifier(page.path), kind: 'ssr', entry: 'vercel', paths, sources: [page] });
  }
  const groups = new Map<string, FileRoute[]>();
  for (const api of apis) {
    const key = signature(api.path);
    const group = groups.get(key) ?? [];
    group.push(api);
    groups.set(key, group);
  }
  for (const [path, sources] of groups) {
    const id = identifier(path);
    functions.push({ name: '__fastang/endpoints/' + id, kind: 'api', entry: 'endpoint-' + id, paths: ['/api' + (sources[0].path ? '/' + sources[0].path : '')], sources });
  }
  return { mode, functions };
}

/** Generates API entries and component-pruned route graphs for page functions. */
export async function prepareVercelPlan(prerendered: string[], options?: VercelOptions, root = process.cwd()): Promise<VercelPlan> {
  const [pages, apis] = await Promise.all([
    discover(resolve(root, 'src/app/pages'), 'page'),
    discover(resolve(root, 'src/server/api'), 'api'),
  ]);
  const plan = planVercelFunctions(pages, apis, prerendered, options);
  const directory = resolve(root, '.fastang/vercel');
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const tree = await discoverPageTree(resolve(root, 'src/app/pages'));
  for (const fn of plan.functions.filter((fn) => options?.prunePages !== false && fn.sources.length && fn.kind === 'ssr')) {
    const id = fn.name.split('/').at(-1)!;
    fn.bundle = `dist/pages/${id}/server/index.js`;
    fn.routesModule = `.fastang/vercel/${id}.routes.ts`;
    fn.renderedComponents = renderedPageFiles(tree, fn.sources[0].file);
    await writeFile(resolve(root, fn.routesModule), pageRoutesSource(tree, {
      pagesImport: '../../src/app/pages/', selectedFile: fn.sources[0].file,
      omittedImport: '../../src/app/omitted.server',
    }));
  }
  for (const fn of plan.functions.filter((fn) => fn.sources.length && fn.kind === 'api')) {
    const imports = fn.sources.map((route, index) => `import route${index} from ${JSON.stringify('../../src/server/api/' + route.file.slice(0, -3))};`).join('\n');
    const registrations = fn.sources.map((route, index) => `    route${index}(app, ${JSON.stringify(route.method)}, ${JSON.stringify('/api' + (route.path ? '/' + route.path : ''))});`).join('\n');
    await writeFile(resolve(directory, fn.entry + '.ts'), `// Generated by FastAng.\nimport { createHttpServer } from '@fastang/core/http-server';\nimport { createNodeHandler } from '@fastang/core/node-handler';\nimport { configureServer } from '../../src/server/plugins.ts';\n${imports}\nexport default createNodeHandler(() => createHttpServer({\n  configure: async (app) => {\n    await configureServer(app);\n${registrations}\n  },\n}));\n`);
  }
  return plan;
}
