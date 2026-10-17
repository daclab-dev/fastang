import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { fastang } from '../framework/vite-plugin';

test('il build browser blocca un import transitivo dal backend', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fastang-boundary-'));
  try {
    await mkdir(join(root, 'src/server'), { recursive: true });
    await writeFile(join(root, 'entry.ts'), "import { value } from './helper'; console.log(value);");
    await writeFile(join(root, 'helper.ts'), "export { value } from './src/server/secrets';");
    await writeFile(join(root, 'src/server/secrets.ts'), "export const value = 'server-only';");
    const plugin = fastang();
    // La discovery è verificata separatamente; qui isoliamo il confine dei bundle.
    delete plugin.buildStart;
    await assert.rejects(build({
      root, configFile: false, logLevel: 'silent', plugins: [plugin],
      build: { write: false, lib: { entry: join(root, 'entry.ts'), formats: ['es'] } },
    }), /Modulo server importato nel client/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
