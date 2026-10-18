import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export interface FileRoute {
  file: string;
  path: string;
  method?: string;
}

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

export function fileRoute(file: string, kind: 'page' | 'api'): FileRoute {
  const suffix = kind === 'page' ? '.page.ts' : '.ts';
  if (!file.endsWith(suffix)) throw new Error(`Invalid extension: ${file}`);
  let stem = file.slice(0, -suffix.length);
  let method: string | undefined;
  if (kind === 'api') {
    const parts = stem.split('.');
    const candidate = parts.pop()!;
    if (!METHODS.has(candidate)) throw new Error(`API ${file} must specify a method, e.g. health.get.ts`);
    method = candidate.toUpperCase();
    stem = parts.join('.');
  }
  const segments = stem.split(/[/.]/);
  // [...slug] contiene punti: ricomponiamo i segmenti prima della conversione.
  const normalized = stem.replace(/\[\.\.\.([A-Za-z_][\w]*)\]/g, '[$1*]').split(/[/.]/);
  const paths: string[] = [];
  for (const [index, segment] of normalized.entries()) {
    if (segment === 'index' && index === normalized.length - 1) continue;
    if (/^\([\w-]+\)$/.test(segment)) continue;
    const wildcard = /^\[([A-Za-z_][\w]*)\*\]$/.exec(segment);
    if (wildcard) {
      if (index !== normalized.length - 1) throw new Error(`Catch-all must be the final segment: ${file}`);
      paths.push(kind === 'page' ? '**' : '*');
      continue;
    }
    const parameter = /^\[([A-Za-z_][\w]*)\]$/.exec(segment);
    if (parameter) paths.push(`:${parameter[1]}`);
    else if (/^[\w-]+$/.test(segment)) paths.push(segment);
    else throw new Error(`Unsupported segment in ${file}: ${segment}`);
  }
  if (!segments.length) throw new Error(`Empty route: ${file}`);
  const params = paths.filter((part) => part.startsWith(':'));
  if (new Set(params).size !== params.length) throw new Error(`Duplicate parameter: ${file}`);
  return { file, path: paths.join('/'), ...(method ? { method } : {}) };
}

export function sortAndValidate(routes: FileRoute[]): FileRoute[] {
  const seen = new Map<string, string>();
  for (const route of routes) {
    const key = `${route.method ?? 'PAGE'} ${route.path.replace(/:[^/]+/g, ':')}`;
    if (seen.has(key)) throw new Error(`Route collision between ${seen.get(key)} and ${route.file}`);
    seen.set(key, route.file);
  }
  const weight = (segment: string) => segment.startsWith('*') ? 0 : segment.startsWith(':') ? 1 : 2;
  return [...routes].sort((a, b) => {
    const left = a.path.split('/');
    const right = b.path.split('/');
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      const priority = weight(right[i]) - weight(left[i]);
      if (priority) return priority;
    }
    return right.length - left.length || a.path.localeCompare(b.path) || a.file.localeCompare(b.file);
  });
}

async function listFiles(directory: string): Promise<string[]> {
  async function walk(path: string): Promise<string[]> {
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) return [];
      const target = resolve(path, entry.name);
      if (entry.isDirectory()) return walk(target);
      return entry.isFile() ? [relative(directory, target).replaceAll('\\', '/')] : [];
    }));
    return nested.flat();
  }
  return walk(directory);
}

export async function discover(directory: string, kind: 'page' | 'api'): Promise<FileRoute[]> {
  const files = await listFiles(directory);
  const accepted = kind === 'page'
    ? files.filter((file) => file.endsWith('.page.ts'))
    : files.filter((file) => /\.(get|post|put|patch|delete|head|options)\.ts$/.test(file));
  return sortAndValidate(accepted.map((file) => fileRoute(file, kind)));
}

export interface PageRouteNode {
  file: string;
  path: string;
  fullPath: string;
  kind: 'page' | 'layout';
  metadata?: string;
  children?: PageRouteNode[];
}

const segments = (path: string) => path ? path.split('/') : [];
const directoryOf = (file: string) => file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
const contains = (directory: string, file: string) => !directory || file.startsWith(directory + '/');

function overlaps(left: string, right: string): boolean {
  const a = segments(left);
  const b = segments(right);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === '**' || b[i] === '**') return true;
    if (a[i] === undefined || b[i] === undefined) return false;
    if (a[i] !== b[i] && !a[i].startsWith(':') && !b[i].startsWith(':')) return false;
  }
  return true;
}

function leaves(nodes: PageRouteNode[]): PageRouteNode[] {
  return nodes.flatMap((node) => node.kind === 'page' ? [node] : leaves(node.children ?? []));
}

export function buildPageTree(files: string[]): PageRouteNode[] {
  const pages = sortAndValidate(files.filter((file) => file.endsWith('.page.ts')).map((file) => fileRoute(file, 'page')));
  if (pages.some((page) => /(^|\/)layout\.page\.ts$/.test(page.file))) {
    throw new Error('layout.page.ts is reserved: use layout.ts for a layout or another page name');
  }
  const layouts = files.filter((file) => /(^|\/)layout\.ts$/.test(file))
    .sort((a, b) => segments(a).length - segments(b).length || a.localeCompare(b));
  const available = new Set(files);
  const usedMetadata = new Set<string>();
  const roots: PageRouteNode[] = [];
  const parents: { directory: string; node: PageRouteNode }[] = [];
  const parentFor = (file: string) => parents.filter((parent) => contains(parent.directory, file)).at(-1);
  const makeNode = (file: string, fullPath: string, kind: 'page' | 'layout', parent?: PageRouteNode): PageRouteNode => {
    const metadata = kind === 'page' ? file.replace(/\.page\.ts$/, '.route.ts') : file.replace(/\.ts$/, '.route.ts');
    if (available.has(metadata)) usedMetadata.add(metadata);
    return {
      file, kind, fullPath,
      path: segments(fullPath).slice(segments(parent?.fullPath ?? '').length).join('/'),
      ...(available.has(metadata) ? { metadata } : {}),
      ...(kind === 'layout' ? { children: [] } : {}),
    };
  };
  for (const file of layouts) {
    const directory = directoryOf(file);
    // Non includere se stesso nella ricerca del layout genitore.
    const parent = parentFor(file);
    if (/\[\.\.\./.test(directory)) throw new Error(`Layouts below catch-all routes are not supported: ${file}`);
    const fullPath = fileRoute((directory ? directory + '/' : '') + 'index.page.ts', 'page').path;
    if (fullPath.includes('**')) throw new Error(`Layouts below catch-all routes are not supported: ${file}`);
    const node = makeNode(file, fullPath, 'layout', parent?.node);
    (parent?.node.children ?? roots).push(node);
    parents.push({ directory, node });
    // Il più profondo deve essere sempre l'ultimo candidato, anche in directory sorelle.
    parents.sort((a, b) => segments(a.directory).length - segments(b.directory).length || a.directory.localeCompare(b.directory));
  }
  for (const page of pages) {
    const parent = parentFor(page.file);
    const node = makeNode(page.file, page.path, 'page', parent?.node);
    (parent?.node.children ?? roots).push(node);
  }
  for (const file of files.filter((file) => file.endsWith('.route.ts'))) {
    if (!usedMetadata.has(file)) throw new Error(`Metadata has no matching page or layout: ${file}`);
  }
  const ranks = new Map(pages.map((page, index) => [page.file, index]));
  const rank = (node: PageRouteNode) => Math.min(...leaves([node]).map((page) => ranks.get(page.file)!));
  function order(nodes: PageRouteNode[]): PageRouteNode[] {
    return nodes.filter((node) => node.kind === 'page' || leaves([node]).length > 0)
      .map((node) => node.children ? { ...node, children: order(node.children) } : node)
      .sort((a, b) => rank(a) - rank(b));
  }
  const tree = order(roots);
  // Un gruppo pathless con un wildcard può oscurare una rotta più specifica
  // in un altro ramo. Rifiutiamo gli alberi ambigui invece di cambiare le URL.
  const ordered = leaves(tree);
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (ranks.get(ordered[i].file)! > ranks.get(ordered[j].file)! && overlaps(ordered[i].fullPath, ordered[j].fullPath)) {
        throw new Error(`Ambiguous order between ${ordered[i].file} and ${ordered[j].file}: move the layout to a shared ancestor or separate the paths`);
      }
    }
  }
  return tree;
}

export async function discoverPageTree(directory: string): Promise<PageRouteNode[]> {
  return buildPageTree(await listFiles(directory));
}

export interface RouteInspection {
  schemaVersion: 1;
  pages: {
    path: string;
    file: string;
    metadata?: string;
    layouts: { path: string; file: string; metadata?: string }[];
  }[];
  api: { method: string; path: string; file: string }[];
}

/** Inspect file conventions without evaluating application modules or writing files. */
export async function inspectRoutes(root = process.cwd()): Promise<RouteInspection> {
  const [tree, endpoints] = await Promise.all([
    discoverPageTree(resolve(root, 'src/app/pages')),
    discover(resolve(root, 'src/server/api'), 'api'),
  ]);
  const pages: RouteInspection['pages'] = [];
  const describe = (node: PageRouteNode) => ({
    path: '/' + node.fullPath,
    file: 'src/app/pages/' + node.file,
    ...(node.metadata ? { metadata: 'src/app/pages/' + node.metadata } : {}),
  });
  function visit(nodes: PageRouteNode[], layouts: RouteInspection['pages'][number]['layouts']) {
    for (const node of nodes) {
      if (node.kind === 'layout') visit(node.children ?? [], [...layouts, describe(node)]);
      else pages.push({ ...describe(node), layouts });
    }
  }
  visit(tree, []);
  return {
    schemaVersion: 1,
    pages,
    api: endpoints.map(route => ({ method: route.method!, path: '/api' + (route.path ? '/' + route.path : ''), file: 'src/server/api/' + route.file })),
  };
}

async function writeChanged(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  if (await readFile(file, 'utf8').catch(() => '') !== content) await writeFile(file, content);
}

export interface PageRoutesSourceOptions {
  pagesImport: string;
  selectedFile?: string;
  omittedImport?: string;
}

/** Keep the selected branch and real 404 components; other routes retain their metadata. */
export function renderedPageFiles(nodes: PageRouteNode[], selectedFile: string): string[] {
  const files: string[] = [];
  function visit(node: PageRouteNode): boolean {
    const children = (node.children ?? []).map(visit);
    const keep = node.file === selectedFile || node.kind === 'page' && node.fullPath.includes('**') || children.some(Boolean);
    if (keep) files.push(node.file);
    return keep;
  }
  nodes.forEach(visit);
  return files;
}

export function pageRoutesSource(pages: PageRouteNode[], options: PageRoutesSourceOptions): string {
  if (options.selectedFile && !options.omittedImport) throw new Error('Missing omitted component import');
  const banner = '// Generato da FastAng. Non modificare manualmente.\n';
  const rendered = new Set(options.selectedFile ? renderedPageFiles(pages, options.selectedFile) : []);
  if (options.selectedFile && !rendered.has(options.selectedFile)) throw new Error(`Unknown SSR page: ${options.selectedFile}`);
  const metadataImports: string[] = [];
  function emit(nodes: PageRouteNode[], depth = 1): string {
    const indent = '  '.repeat(depth);
    return nodes.map((node) => {
      let metadata = '';
      if (node.metadata) {
        const name = `metadata${metadataImports.length}`;
        metadataImports.push(`import ${name} from ${JSON.stringify(options.pagesImport + node.metadata.slice(0, -3))};`);
        metadata = `...${name}, `;
      }
      const included = !options.selectedFile || rendered.has(node.file);
      const target = included ? options.pagesImport + node.file.slice(0, -3) : options.omittedImport!;
      const component = `loadComponent: () => import(${JSON.stringify(target)}).then(m => m.default)`;
      const children = node.children ? `, children: [\n${emit(node.children, depth + 1)}\n${indent}]` : '';
      return `${indent}{ ${metadata}path: ${JSON.stringify(node.path)}, ${component}${children} },`;
    }).join('\n');
  }
  const pageCode = emit(pages, 2);
  return `${banner}import type { Routes } from '@angular/router';\n${metadataImports.join('\n')}\n\n// Angular associa injector e componenti caricati alle route: oggetti nuovi per ogni SSR.\nexport function createRoutes(): Routes {\n  return [\n${pageCode}\n  ];\n}\n`;
}

export async function generate(root = process.cwd()): Promise<void> {
  const [pages, apis] = await Promise.all([
    discoverPageTree(resolve(root, 'src/app/pages')),
    discover(resolve(root, 'src/server/api'), 'api'),
  ]);
  const banner = '// Generato da FastAng. Non modificare manualmente.\n';
  await writeChanged(resolve(root, 'src/app/fastang.routes.ts'), pageRoutesSource(pages, { pagesImport: './pages/' }));
  const imports = apis.map((route, i) => `import route${i} from ${JSON.stringify('../src/server/api/' + route.file.slice(0, -3))};`).join('\n');
  const registrations = apis.map((route, i) => `  route${i}(app, ${JSON.stringify(route.method)}, ${JSON.stringify('/api' + (route.path ? '/' + route.path : ''))});`).join('\n');
  await writeChanged(resolve(root, '.fastang/api.ts'), `${banner}import type { FastifyInstance } from 'fastify';\n${imports}\nexport function registerApi(app: FastifyInstance): void {\n${registrations}\n}\n`);
}
