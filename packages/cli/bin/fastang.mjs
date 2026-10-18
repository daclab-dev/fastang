#!/usr/bin/env node
import { resolve } from 'node:path';
import { ProcessError, runProcess } from '../dist/process.js';
import { cliVersion, installedPackage, newProject, updateProject } from '../dist/commands/project.js';

const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'new') await newProject(args);
  else if (command === 'update') await updateProject(args);
  else if (command === '--version' || command === '-v') console.log(await cliVersion());
  else if (!command || command === '--help' || command === '-h') {
    console.log('Usage: fastang <new|update|dev|build|generate|routes|check>\n  new <directory> [--install]\n  update --to <version|tag> [--dry-run | --yes] [--allow-downgrade]\n  dev, build, generate, routes, check: use the core installed in your app');
  } else if (['dev', 'build', 'generate', 'routes', 'check'].includes(command)) {
    const pkg = await installedPackage('@fastang/core', process.cwd());
    if (!pkg) throw new Error('No local @fastang/core found. Run this command inside an installed FastAng app.');
    if (typeof pkg.manifest.bin?.fastang !== 'string') throw new Error('The local core has no fastang executable.');
    const bin = resolve(pkg.directory, pkg.manifest.bin.fastang);
    await runProcess(process.execPath, [bin, command, ...args]);
  } else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`fastang: ${error instanceof Error ? error.message : error}`);
  process.exitCode = error instanceof ProcessError ? error.code : 1;
}
