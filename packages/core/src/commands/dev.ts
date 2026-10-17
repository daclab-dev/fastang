import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';

let child: ChildProcess | undefined;
let stopping = false;
let timer: ReturnType<typeof setTimeout>;
let queue = Promise.resolve();

async function stopChild() {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
}
async function restart() {
  await stopChild();
  if (stopping) return;
  // Processo nuovo: anche le modifiche al generatore sono applicate al riavvio.
  const generator = spawn(process.execPath, [fileURLToPath(new URL('../cli.js', import.meta.url)), 'generate'], { stdio: 'inherit', env: process.env });
  const [code] = await once(generator, 'exit');
  if (code !== 0) throw new Error('Generazione route fallita');
  child = spawn(process.execPath, [fileURLToPath(new URL('./dev-server.js', import.meta.url))], { stdio: 'inherit', env: process.env });
  child.on('error', (error) => { console.error(error); process.exitCode = 1; });
}
function changed() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    queue = queue.then(restart).catch((error: unknown) => console.error(error));
  }, 150);
}
// Solo sorgenti backend e configurazione: i moduli temporanei di Vite non causano riavvii.
const watchers = ['src/server', 'src/shared', 'vite.config.ts', 'fastang.config.ts'].filter(existsSync).map(path => watch(path, { recursive: true }, changed));

async function shutdown() {
  stopping = true;
  clearTimeout(timer);
  watchers.forEach((watcher) => watcher.close());
  await queue;
  await stopChild();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
await restart();
