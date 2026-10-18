import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { runProcess } from './process.ts';
export type PackageManager = 'npm' | 'pnpm';
export type PackageRunner = (args: string[], capture?: boolean) => Promise<string>;
export function fromUserAgent(agent = process.env['npm_config_user_agent']): PackageManager {
  const name = agent?.split('/')[0];
  if (!name || name === 'npm') return 'npm';
  if (name === 'pnpm') return 'pnpm';
  throw new Error(`Unsupported package manager ${name}. Choose npm or pnpm with --package-manager.`);
}
export function managerOption(args: string[]): PackageManager | undefined {
  let manager: PackageManager | undefined;
  for (let i = 0; i < args.length && args[i] !== '--'; i++) {
    if (args[i] !== '--package-manager') continue;
    const value = args[++i];
    if (manager || !['npm', 'pnpm'].includes(value)) throw new Error('Use --package-manager npm|pnpm once.');
    manager = value as PackageManager;
  }
  return manager;
}
export function runner(manager: PackageManager): PackageRunner {
  return async (args, capture = false) => {
    const windows = process.platform === 'win32';
    if (windows && args.some(arg => /[&|<>^%!"\r\n]/.test(arg))) throw new Error(`Unsupported shell characters in ${manager} arguments on Windows.`);
    return runProcess(windows ? `${manager}.cmd` : manager, windows ? args.map(arg => `"${arg}"`) : args, { capture, shell: windows });
  };
}
async function optional(file: string): Promise<string | undefined> {
  try { return await readFile(file, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return undefined; }
}
function yaml(source: string, name: string): any {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw new Error(`Invalid ${name}: ${document.errors[0].message}`);
  return document.toJS({ maxAliasCount: 50 });
}
export async function projectManager(project: {packageManager?: unknown}, directory: string): Promise<PackageManager> {
  const files = await Promise.all(['package-lock.json','pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb','npm-shrinkwrap.json'].map(async name => ({ name, exists: await optional(resolve(directory,name)) !== undefined })));
  const locks = files.filter(file => file.exists).map(file => file.name);
  if (locks.length > 1) throw new Error('Multiple package-manager lockfiles found. Keep the intended lockfile and reconcile the installation manually.');
  if (locks.some(name => !['package-lock.json','pnpm-lock.yaml'].includes(name))) throw new Error('Only npm package-lock.json and pnpm-lock.yaml are supported. No package-manager conversion is performed.');
  let declared: PackageManager | undefined;
  if (project.packageManager !== undefined) {
    if (typeof project.packageManager !== 'string' || !/^(npm|pnpm)@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(project.packageManager)) throw new Error('Unsupported packageManager. Use an npm@version or pnpm@version project.');
    declared = project.packageManager.startsWith('pnpm@') ? 'pnpm' : 'npm';
    if (declared === 'pnpm' && !/^pnpm@(10|11)\./.test(project.packageManager)) throw new Error('Supported pnpm versions: 10 and 11.');
  }
  const locked = locks[0] ? locks[0] === 'pnpm-lock.yaml' ? 'pnpm' : 'npm' : undefined;
  if (declared && locked && declared !== locked) throw new Error('packageManager and lockfile disagree. Reconcile them manually before updating.');
  return declared ?? locked ?? fromUserAgent();
}
export interface LockedCore { version?: string; declaration?: string; problems: string[] }
export async function lockedCore(manager: PackageManager, directory: string, section: string): Promise<LockedCore> {
  const name = manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml';
  const source = await optional(resolve(directory,name));
  if (!source) return {problems:[`${name} is missing. Run ${manager} install and review the lockfile first.`]};
  if (manager === 'npm') {
    const lock = JSON.parse(source);
    return {version:lock.packages?.['node_modules/@fastang/core']?.version,declaration:lock.packages?.['']?.[section]?.['@fastang/core'],problems:[2,3].includes(lock.lockfileVersion) ? [] : ['Unsupported lockfile format. Regenerate with a supported npm version.']};
  }
  const workspace = await optional(resolve(directory,'pnpm-workspace.yaml'));
  if (workspace) {
    const settings = yaml(workspace,'pnpm-workspace.yaml');
    if (settings?.packages && (!Array.isArray(settings.packages) || settings.packages.some((value: unknown) => value !== '.'))) throw new Error('Run update in a standalone app, not a pnpm workspace root. Update workspace dependencies manually.');
  }
  const lock = yaml(source,name);
  if (!lock || !['9','9.0'].includes(String(lock.lockfileVersion)) || !lock.importers?.['.']) return {problems:['Unsupported pnpm lockfile. Supported: pnpm 10/11, lockfileVersion 9.0 with a standalone root importer.']};
  if (Object.keys(lock.importers).some(key => key !== '.')) throw new Error('Shared pnpm workspace lockfiles are not supported by update. Update workspace dependencies manually.');
  const core = lock.importers['.'][section]?.['@fastang/core'];
  const version = typeof core?.version === 'string' ? core.version.split('(')[0] : undefined;
  return {version,declaration:core?.specifier,problems:[]};
}
