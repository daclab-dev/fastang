import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { createProductionServer } = await import(pathToFileURL(resolve('dist/server/index.js')).href);
const server = await createProductionServer();
try {
  const address = await server.listen({ host: '127.0.0.1', port: 0 });
  const child = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.docs.config.ts', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, FASTANG_E2E_BASE_URL: address } });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(code, 0, 'Documentation browser tests failed');
} finally { await server.close(); }
