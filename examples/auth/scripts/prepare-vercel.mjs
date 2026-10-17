// The plugin's dynamic require-addon loader is not currently recognized by NFT.
// Copy its published prebuilds explicitly, preserving the original package path.
import { cp, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
const require = createRequire(resolve('package.json'));
const prebuilds = join(dirname(require.resolve('sodium-native')), 'prebuilds');
await stat(prebuilds); // Fail the build if the installed package layout changes.
async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const target = join(directory, entry.name);
    if (entry.name.endsWith('.func')) {
      await cp(prebuilds, join(target, 'node_modules/sodium-native/prebuilds'), { recursive: true });
    } else await prepare(target);
  }
}
await prepare('.vercel/output/functions');
console.log('Vercel functions include the session plugin native prebuilds.');
