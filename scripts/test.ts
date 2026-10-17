import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Esegue node:test nello stesso processo: compatibile anche con i loader TS su Node 26.
const directory = process.argv.includes('--vercel') ? 'tests/vercel' : process.argv.includes('--production') ? 'tests/production' : 'tests';
for (const file of (await readdir(directory)).filter((name) => name.endsWith('.test.ts')).sort()) {
  await import(pathToFileURL(resolve(directory, file)).href);
}
