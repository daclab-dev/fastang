import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { lt, satisfies, valid, validRange } from 'semver';

import { runProcess } from '../process.ts';

export type NpmRunner = (args: string[], capture?: boolean) => Promise<string>;
export const runNpm: NpmRunner = async (args, capture = false) => {
  const windows = process.platform === 'win32';
  if (windows && args.some(arg => /[&|<>^%!"\r\n]/.test(arg))) throw new Error('Unsupported shell characters in npm arguments on Windows.');
  return runProcess(windows ? 'npm.cmd' : 'npm', windows ? args.map(arg => `"${arg}"`) : args, { capture, shell: windows });
};

export async function cliVersion(): Promise<string> {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  return manifest.version;
}

export async function newProject(args: string[], npm: NpmRunner = runNpm): Promise<void> {
  // A release always uses its matching generator; existing destinations are rejected there.
  await npm(['exec', '--yes', `--package=create-fastang@${await cliVersion()}`, '--', 'create-fastang', ...args]);
}

export async function installedPackage(name: string, directory: string): Promise<{ directory: string; manifest: Record<string, any> } | undefined> {
  let current = resolve(directory);
  while (true) {
    const root = join(current, 'node_modules', name);
    try {
      const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
      if (manifest.name === name) return { directory: root, manifest };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export async function installedVersion(name: string, directory: string): Promise<string | undefined> {
  const pkg = await installedPackage(name, directory);
  return pkg && valid(pkg.manifest.version) ? pkg.manifest.version : undefined;
}

export async function updateProject(args: string[], npm: NpmRunner = runNpm, directory = process.cwd(), log = console.log): Promise<void> {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    log('Usage: fastang update --to <version|tag> [--dry-run | --yes] [--allow-downgrade]');
    return;
  }
  let target: string | undefined;
  let apply = false;
  let dryRun = false;
  let allowDowngrade = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--to' && !target) target = args[++i];
    else if (arg === '--allow-downgrade' && !allowDowngrade) allowDowngrade = true;
    else if (arg === '--yes' && !apply) apply = true;
    else if (arg === '--dry-run' && !dryRun) dryRun = true;
    else throw new Error('Usage: fastang update --to <version|tag> [--dry-run | --yes] [--allow-downgrade]');
  }
  if (!target || !/^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/.test(target) || (apply && dryRun)) {
    throw new Error('Usage: fastang update --to <version|tag> [--dry-run | --yes] [--allow-downgrade]');
  }
  const project = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  if (project.workspaces) throw new Error('Run update in an individual app, not a workspace root. Update workspace dependencies manually.');
  if (project.packageManager && !project.packageManager.startsWith('npm@')) throw new Error('fastang update currently supports npm projects only.');
  const section = project.dependencies?.['@fastang/core'] ? 'dependencies' : project.devDependencies?.['@fastang/core'] ? 'devDependencies' : undefined;
  if (!section) throw new Error('This project does not declare @fastang/core. Run the command from your app directory.');
  const response = JSON.parse(await npm(['view', `@fastang/core@${target}`, 'version', 'engines', 'peerDependencies', 'peerDependenciesMeta', '--json'], true));
  const metadata = Array.isArray(response) && response.length === 1 ? response[0] : response;
  if (!metadata || typeof metadata.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/.test(metadata.version)) throw new Error('npm did not return a single release version.');
  const current = await installedVersion('@fastang/core', directory);
  const declared = project[section]['@fastang/core'];
  const problems: string[] = [];
  let lock: any;
  try { lock = JSON.parse(await readFile(resolve(directory, 'package-lock.json'), 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    problems.push('package-lock.json is missing. Run npm install and review the lockfile first.');
  }
  const locked = lock?.packages?.['node_modules/@fastang/core']?.version;
  const lockedDeclaration = lock?.packages?.['']?.[section]?.['@fastang/core'];
  log(`@fastang/core: declared ${declared}; locked ${locked ?? 'unknown'}; installed ${current ?? 'missing'}; target ${metadata.version}`);
  if (lock && ![2, 3].includes(lock.lockfileVersion)) problems.push('Unsupported lockfile format. Regenerate with a supported npm version.');
  if (lock && lockedDeclaration !== declared) problems.push('Manifest and lockfile declarations differ. Run npm install and review the diff first.');
  if (lock && (!valid(locked) || locked !== current)) problems.push('Lockfile and installed core differ. Run npm ci first.');
  if (current && validRange(declared) && !satisfies(current, declared)) problems.push('Installed core does not satisfy the manifest declaration. Reconcile the manifest and installation first.');
  const downgrade = current && lt(metadata.version, current);
  if (downgrade) log('DOWNGRADE: target is older than the installed core.');
  if (!current) problems.push('Cannot determine installed core. Run npm install first.');
  if (metadata.engines?.node) {
    const ok = satisfies(process.versions.node, metadata.engines.node);
    log(`Node ${process.versions.node}: ${ok ? 'OK' : 'INCOMPATIBLE'} (requires ${metadata.engines.node})`);
    if (!ok) problems.push('Node does not satisfy the target engine requirement.');
  }
  for (const [name, range] of Object.entries(metadata.peerDependencies ?? {}) as [string, string][]) {
    const version = await installedVersion(name, directory);
    const optional = metadata.peerDependenciesMeta?.[name]?.optional === true;
    const ok = version ? satisfies(version, range) : optional;
    log(`${name}: ${version ?? 'not installed'} — ${ok ? 'OK' : 'INCOMPATIBLE'} (requires ${range}${optional ? ', optional' : ''})`);
    if (!ok) problems.push(`${name} must satisfy ${range}.`);
  }
  log('Read the release migration notes and commit your app and lockfile first. App source files are not migrated.');
  if (current === metadata.version && !problems.length) { log('Already installed. No changes.'); return; }
  if (!apply) {
    for (const problem of problems) log(problem);
    log(`Plan only. Apply with: fastang-cli update --to ${metadata.version} --yes${downgrade ? ' --allow-downgrade' : ''}`);
    return;
  }
  if (downgrade && !allowDowngrade) throw new Error('Downgrade blocked. Use --allow-downgrade explicitly.');
  if (problems.length) throw new Error(problems.join('\n'));
  if (resolve(directory) !== resolve(process.cwd())) throw new Error('Apply must run from the app directory.');
  await npm(['install', section === 'devDependencies' ? '--save-dev' : '--save-prod', '--save-exact', '--engine-strict', '--strict-peer-deps', `@fastang/core@${metadata.version}`]);
  log('Dependency updated. Review the diff, apply any documented migrations, then run your build and tests.');
}
