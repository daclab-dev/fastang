import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import type { PackageManager } from './package-manager.ts';
import { pnpmVersion } from './package-manager.ts';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CreateOptions {
  directory: string;
  cwd?: string;
  name?: string;
  corePackage?: string;
  packageManager?: PackageManager;
  packageManagerVersion?: string;
}

export function packageName(directory: string): string {
  return basename(resolve(directory)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[._-]+$/g, '') || 'fastang-app';
}

export function validatePackageName(name: string): void {
  if (name.length > 214 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name) || ['node_modules', 'favicon.ico'].includes(name)) {
    throw new Error('Invalid npm package name. Use lowercase letters, numbers, dots, hyphens or underscores.');
  }
}

/** Generate atomically into a new directory; existing paths are never replaced. */
export async function createProject(options: CreateOptions): Promise<{ directory: string; name: string; localCore: boolean }> {
  if (options.packageManager && !['npm','pnpm'].includes(options.packageManager)) throw new Error('Supported package managers: npm and pnpm.');
  if (options.packageManagerVersion) pnpmVersion(options.packageManagerVersion);
  if (!options.directory.trim()) throw new Error('Provide a new project directory.');
  const cwd = options.cwd ?? process.cwd();
  const directory = resolve(cwd, options.directory);
  const name = options.name ?? packageName(directory);
  validatePackageName(name);
  if (await lstat(directory).then(() => true, (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return false;
    throw error;
  })) throw new Error(`Destination already exists: ${directory}. Choose a new directory.`);
  let corePackage: string | undefined;
  if (options.corePackage) {
    corePackage = resolve(cwd, options.corePackage);
    if (!(await lstat(corePackage)).isFile() || !corePackage.endsWith('.tgz')) throw new Error('--core-package must point to a local npm .tgz package.');
  }
  const template = fileURLToPath(new URL('../template/', import.meta.url));
  const manifest = JSON.parse(await readFile(resolve(template, 'package.json'), 'utf8'));
  manifest.name = name;
  if (options.packageManager === 'pnpm') {
    for (const key of Object.keys(manifest.scripts)) manifest.scripts[key] = manifest.scripts[key].replace(/npm run /g, 'pnpm run ');
    if (options.packageManagerVersion) manifest.packageManager = `pnpm@${options.packageManagerVersion}`;
  }
  if (corePackage) manifest.dependencies['@fastang/core'] = `file:${corePackage}`;
  await mkdir(dirname(directory), { recursive: true });
  const staging = await mkdtemp(resolve(dirname(directory), '.fastang-create-'));
  try {
    await cp(template, resolve(staging, 'project'), { recursive: true, force: false, errorOnExist: true });
    await rename(resolve(staging, 'project/_gitignore'), resolve(staging, 'project/.gitignore'));
    await writeFile(resolve(staging, 'project/package.json'), JSON.stringify(manifest, null, 2) + '\n');
    // Recheck before rename: do not replace a directory created while copying.
    if (await lstat(directory).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    })) throw new Error(`Destination already exists: ${directory}. Choose a new directory.`);
    if (options.packageManager === 'pnpm') {
      const builds = ['@parcel/watcher','esbuild','lmdb','msgpackr-extract'];
      const policy = options.packageManagerVersion
        ? options.packageManagerVersion.startsWith('10.')
          ? 'onlyBuiltDependencies:\n' + builds.map(name => `  - '${name}'\n`).join('')
          : 'allowBuilds:\n' + builds.map(name => `  '${name}': true\n`).join('')
        : '# Run pnpm approve-builds before building if dependency scripts are blocked.\n';
      await writeFile(resolve(staging, 'project/pnpm-workspace.yaml'), '# Build scripts allowed for the Angular toolchain. Review when changing dependencies.\nstrictPeerDependencies: true\n' + policy);
      const readme = resolve(staging,'project/README.md');
      await writeFile(readme,(await readFile(readme,'utf8')).replace(/npm run /g,'pnpm run ').replace(/npm install/g,'pnpm install'));
    }
    await rename(resolve(staging, 'project'), directory);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return { directory, name, localCore: Boolean(corePackage) };
}
