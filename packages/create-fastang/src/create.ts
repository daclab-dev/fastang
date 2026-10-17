import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CreateOptions {
  directory: string;
  cwd?: string;
  name?: string;
  corePackage?: string;
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
    await rename(resolve(staging, 'project'), directory);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return { directory, name, localCore: Boolean(corePackage) };
}
