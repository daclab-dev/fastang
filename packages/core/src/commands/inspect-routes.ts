import { inspectRoutes } from '../routes.ts';

const args = process.argv.slice(3);
if (args.length > 1 || args.some(argument => argument !== '--json')) throw new Error('Usage: fastang routes [--json]');
const manifest = await inspectRoutes();
if (args.includes('--json')) console.log(JSON.stringify(manifest, null, 2));
else {
  console.log('File-based page routes (matching order)');
  for (const page of manifest.pages) {
    console.log(`PAGE ${page.path}  ${page.file}`);
    for (const layout of page.layouts) console.log(`  layout ${layout.path}  ${layout.file}${layout.metadata ? `  metadata: ${layout.metadata}` : ''}`);
    if (page.metadata) console.log(`  metadata ${page.metadata}`);
  }
  if (!manifest.pages.length) console.log('(none)');
  console.log('\nFile-based API routes');
  for (const route of manifest.api) console.log(`${route.method.padEnd(7)} ${route.path}  ${route.file}`);
  if (!manifest.api.length) console.log('(none)');
  console.log('\nFile conventions only: application router prefixes, plugin routes and implicit HEAD routes are not included.');
}
