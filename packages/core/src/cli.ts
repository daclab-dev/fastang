#!/usr/bin/env node
const command = process.argv[2];
try {
  if (command === 'generate') await (await import('./routes.ts')).generate();
  else if (command === 'check') await import('./commands/check.ts');
  else if (command === 'routes') await import('./commands/inspect-routes.ts');
  else if (command === 'dev') await import('./commands/dev.ts');
  else if (command === 'build') await import('./commands/build.ts');
  else if (!command || command === '--help' || command === '-h') console.log('Usage: fastang <dev|generate|build|routes|check>\n  build [--vercel]\n  routes [--json]\n  check [--project tsconfig.node.json] [--json] [--strict]');
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
export {};
