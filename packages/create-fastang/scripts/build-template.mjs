import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const source = fileURLToPath(new URL('../../../examples/starter/', import.meta.url));
const target = fileURLToPath(new URL('../template/', import.meta.url));
const excluded = new Set(['node_modules', 'dist', '.fastang', '.angular', '.vercel', 'package-lock.json', 'README.md', '.git', '.npmrc', '.agents', '.codex']);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const name of await readdir(source)) {
  if (excluded.has(name) || name === '.env' || name.startsWith('.env.')) continue;
  await cp(join(source, name), join(target, name === '.gitignore' ? '_gitignore' : name), { recursive: true,
    filter: path => {
      const name = path.split(/[\\/]/).at(-1);
      return !excluded.has(name) && name !== '.env' && !name.startsWith('.env.') && !path.endsWith('fastang.routes.ts');
    },
  });
}
const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
const core = JSON.parse(await readFile(new URL('../../core/package.json', import.meta.url), 'utf8'));
manifest.dependencies['@fastang/core'] = core.version;
await writeFile(join(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(join(target, 'README.md'), `# FastAng app

Angular pages, Fastify APIs and server rendering.

\`\`\`sh
npm install
npm run dev
\`\`\`

Open http://localhost:3278. Use PORT and HOST to override the defaults.

## Commands

- \`npm run check\`: generate routes and validate types and Angular templates.
- \`npm run build\`: build the Node server, client assets and prerendered pages.
- \`npm start\`: run the production server.
- \`npm run build:vercel\`: generate the Vercel Build Output API directory.

## Application files

- \`src/app/pages\`: Angular pages and adjacent route metadata.
- \`src/server/api\`: Fastify endpoints; the filename selects the HTTP method.
- \`src/server/plugins.ts\`: Fastify hooks and plugins.
- \`fastang.config.ts\`: explicit prerender URLs and Vercel function configuration.

The home page includes an interactive counter. \`/greet/world\` resolves data from
\`/api/greet/world\` during SSR and uses Angular's HTTP transfer cache during
hydration. \`/about\` is prerendered. Unknown pages return HTTP 404.

For Vercel use the Other preset, build command \`npm run build:vercel\`, and no
output-directory override. \`vercel.json\` already contains the build settings.
`);
