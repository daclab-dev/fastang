#!/usr/bin/env node
const command = process.argv[2];
try {
  if (command === 'generate') await (await import('./routes.ts')).generate();
  else if (command === 'dev') await import('./commands/dev.ts');
  else if (command === 'build') await import('./commands/build.ts');
  else if (!command || command === '--help' || command === '-h') console.log('Usage: fastang <dev|generate|build> [--vercel]');
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
export {};
