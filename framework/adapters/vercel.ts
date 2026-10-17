import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { nodeFileTrace } from '@vercel/nft';
import { staticFile } from '../server';
import { sortAndValidate } from '../routes';
import { escapeRegex, routePattern, type VercelPlan } from './vercel-plan';

/** Converts an existing Node build into Vercel Build Output API v3. */
export async function buildVercelOutput(plan: VercelPlan, root = process.cwd()): Promise<void> {
  const output = resolve(root, '.vercel/output');
  const prerendered: string[] = JSON.parse(await readFile(resolve(root, 'dist/prerender.json'), 'utf8'));
  // Validate before touching the previous output.
  for (const path of prerendered) staticFile(path);
  await rm(output, { recursive: true, force: true });
  const copy = async (file: string, destination: string) => {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(resolve(root, file), destination);
  };
  const { cp } = await import('node:fs/promises');
  await cp(resolve(root, 'dist/client/assets'), resolve(output, 'static/assets'), { recursive: true });
  for (const path of prerendered) {
    const file = staticFile(path);
    await copy(`dist/client/${file}`, resolve(output, 'static', file));
  }

  const report: { name: string; tracedFiles: number; tracedBytes: number; serverJavaScriptBytes: number; pageJavaScriptBytes: number }[] = [];
  const traces = new Map<string, Awaited<ReturnType<typeof nodeFileTrace>>>();
  for (const { name, entry, kind, bundle } of plan.functions) {
    const directory = resolve(output, `functions/${name}.func`);
    const entryFile = bundle ?? `dist/server/${entry}.js`;
    // The bundled CommonJS runtime uses a require shim that tracing cannot
    // always recognize. Trace Fastify's original graph for external helpers.
    const fastifyEntry = createRequire(resolve(root, 'package.json')).resolve('fastify');
    const trace = traces.get(entryFile) ?? await nodeFileTrace([entryFile, fastifyEntry], {
      base: root, processCwd: root,
      // Only the private SSR template is needed; public assets stay on the CDN.
      ignore: ['dist/**/client/**', 'dist/client/**', 'dist/**/prerender.json', 'dist/prerender.json'],
    });
    traces.set(entryFile, trace);
    for (const warning of trace.warnings) console.warn(`[vercel:${name}] ${warning.message}`);
    for (const file of trace.fileList) {
      if (file.startsWith('../') || file.startsWith('/')) throw new Error(`Dependency outside project: ${file}`);
      await copy(file, resolve(directory, file));
    }
    if (kind === 'ssr') await copy('dist/client/index.html', resolve(directory, dirname(entryFile), '../client/index.html'));
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, '.vc-config.json'), JSON.stringify({
      runtime: 'nodejs24.x', launcherType: 'Nodejs', handler: entryFile,
      shouldAddHelpers: false, supportsResponseStreaming: true,
    }, null, 2) + '\n');
    const sizes = await Promise.all([...trace.fileList].map(async (file) => ({ file, size: (await stat(resolve(root, file))).size })));
    report.push({
      name, tracedFiles: trace.fileList.size,
      tracedBytes: sizes.reduce((sum, item) => sum + item.size, 0),
      serverJavaScriptBytes: sizes.filter(({ file }) => file.startsWith('dist/') && file.endsWith('.js')).reduce((sum, item) => sum + item.size, 0),
      pageJavaScriptBytes: sizes.filter(({ file }) => file.startsWith('dist/') && /(?:\.page-|\/layout-).*\.js$/.test(file)).reduce((sum, item) => sum + item.size, 0),
    });
    console.log(`Vercel ${name}: ${trace.fileList.size} traced files`);
  }

  await writeFile(resolve(output, 'config.json'), JSON.stringify({
    version: 3,
    routes: [
      { src: '/(.*)', headers: { 'X-Content-Type-Options': 'nosniff' }, continue: true },
      { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
      ...prerendered.map((path) => ({
        src: `^${escapeRegex(path)}/?$`, methods: ['GET', 'HEAD'],
        dest: '/' + staticFile(path), headers: { 'X-Fastang-Render': 'prerender', 'Cache-Control': 'public, max-age=0, must-revalidate' },
      })),
      { handle: 'filesystem' },
      ...sortAndValidate(plan.functions.flatMap((fn) => fn.paths.map((path) => ({ file: fn.name, path: path.replace(/^\//, '') })))).map((route) => ({ src: routePattern('/' + route.path), dest: '/' + route.file })),
      { src: '^/api(?:/.*)?$', dest: '/' + plan.functions.find((fn) => fn.kind === 'api' && !fn.paths.length)!.name },
      { src: '/(.*)', dest: '/' + plan.functions.find((fn) => fn.kind === 'ssr' && !fn.paths.length)!.name },
    ],
  }, null, 2) + '\n');
  await writeFile(resolve(root, 'dist/vercel-bundle-report.json'), JSON.stringify({ version: 1, functions: report }, null, 2) + '\n');
  await writeFile(resolve(root, 'dist/vercel-manifest.json'), JSON.stringify(plan, null, 2) + '\n');
}
