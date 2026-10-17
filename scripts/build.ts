import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import config from '../fastang.config';
import { prepareVercelPlan } from '../framework/adapters/vercel-plan';
import { buildVercelOutput } from '../framework/adapters/vercel';
import { staticFile } from '../framework/server';

const vercel = process.argv.includes('--vercel');

await rm('dist', { recursive: true, force: true });
const paths = [...new Set(config.prerender)];
for (const path of paths) {
  staticFile(path);
  if (path === '/' || path === '/api' || path.startsWith('/api/') || path.startsWith('/assets/')) {
    throw new Error(`Percorso riservato al runtime: ${path}`);
  }
}
const vercelPlan = vercel ? await prepareVercelPlan(paths, config.vercel) : undefined;
const endpointEntries = Object.fromEntries((vercelPlan?.functions ?? []).filter((fn) => fn.entry.startsWith('endpoint-')).map((fn) => [fn.entry, `.fastang/vercel/${fn.entry}.ts`]));

await build({ build: { outDir: 'dist/client' } });
await build({ build: {
  outDir: 'dist/server', minify: true, ssr: vercel ? true : 'src/server/start.ts',
  rollupOptions: {
    ...(vercel ? { input: { index: 'src/server/start.ts', vercel: 'src/server/vercel-entry.ts', api: 'src/server/api-entry.ts', ...endpointEntries } } : {}),
    output: { entryFileNames: vercel ? '[name].js' : 'index.js', ...(vercel ? { chunkFileNames: '[name]-[hash].js' } : {}) },
  },
} });
// Each page build has its own module graph. A multi-entry build would pull
// unrelated lazy components back in through the full-router fallback entry.
for (const fn of vercelPlan?.functions ?? []) {
  if (!fn.bundle || !fn.routesModule) continue;
  await build({
    resolve: { alias: [{ find: /^\.\/fastang\.routes$/, replacement: resolve(fn.routesModule) }] },
    build: {
      outDir: dirname(fn.bundle), minify: true, ssr: 'src/server/vercel-entry.ts',
      rollupOptions: { output: { entryFileNames: 'index.js', chunkFileNames: '[name]-[hash].js' } },
    },
  });
}
const { createProductionServer } = await import(pathToFileURL(resolve('dist/server/index.js')).href);
const app = await createProductionServer({ prerender: false });
try {
  for (const path of paths) {
    const response = await app.inject({ url: path });
    if (response.statusCode !== 200) throw new Error(`Prerender ${path}: HTTP ${response.statusCode}`);
    const target = resolve('dist/client', staticFile(path));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, response.body);
    console.log(`Prerendered ${path}`);
  }
  await writeFile('dist/prerender.json', JSON.stringify(paths, null, 2) + '\n');
} finally { await app.close(); }

if (vercelPlan) await buildVercelOutput(vercelPlan);
