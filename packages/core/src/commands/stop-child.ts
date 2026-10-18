import type { ChildProcess } from 'node:child_process';

/** Give application shutdown hooks time to finish, then bound the supervisor wait. */
export async function stopChild(child: ChildProcess | undefined, timeoutMs = 3000, warn = console.warn): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveStop, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      child.removeListener('exit', exited);
      child.removeListener('error', failed);
    };
    const exited = () => { cleanup(); resolveStop(); };
    const failed = (error: Error) => { cleanup(); reject(error); };
    child.once('exit', exited);
    child.once('error', failed);
    timer = setTimeout(() => {
      warn(`Development server did not stop within ${timeoutMs}ms; forcing termination.`);
      child.kill('SIGKILL');
    }, timeoutMs);
    child.kill('SIGTERM');
  });
}
