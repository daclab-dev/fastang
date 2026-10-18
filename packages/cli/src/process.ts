import { spawn } from 'node:child_process';

export class ProcessError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}

export function runProcess(command: string, args: string[], options: { capture?: boolean; shell?: boolean } = {}): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', shell: options.shell ?? false, detached: process.platform !== 'win32' });
    let output = '';
    const forward = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
    };
    const interrupt = () => forward('SIGINT');
    const terminate = () => forward('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    const cleanup = () => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
    };
    child.stdout?.on('data', chunk => { output += String(chunk); });
    child.on('error', error => { cleanup(); reject(error); });
    child.on('close', (code, signal) => {
      cleanup();
      const status = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
      if (status === 0) resolveRun(output);
      else reject(new ProcessError(status, `${command} ${signal ? `terminated by ${signal}` : `exited with code ${status}`}`));
    });
  });
}
