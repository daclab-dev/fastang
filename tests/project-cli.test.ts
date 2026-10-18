import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cliVersion, newProject, runNpm, updateProject, type NpmRunner } from '../packages/cli/src/commands/project.ts';

async function lockfile(directory: string, version: string, declared = version): Promise<void> {
  await writeFile(join(directory, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': { dependencies: { '@fastang/core': declared } }, 'node_modules/@fastang/core': { version } } }));
}

test('new delegates to the release-matched generator without rewriting arguments', async () => {
  const calls: string[][] = [];
  await newProject(['my app', '--no-install'], async args => { calls.push(args); return ''; });
  assert.deepEqual(calls, [['exec', '--yes', `--package=create-fastang@${await cliVersion()}`, '--', 'create-fastang', 'my app', '--no-install']]);
});

test('update resolves a tag once and defaults to a read-only plan', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fastang-update-'));
  try {
    const manifest = JSON.stringify({ dependencies: { '@fastang/core': '0.1.0-alpha.1' } });
    await writeFile(join(directory, 'package.json'), manifest);
    const calls: string[][] = [];
    const npm: NpmRunner = async args => { calls.push(args); return JSON.stringify([{ version: '0.1.0-alpha.2', peerDependencies: { vite: '8.3.4' } }]); };
    const logs: string[] = [];
    for (const tag of ['alpha', 'latest']) {
      calls.length = 0;
      await updateProject(['--to', tag], npm, directory, message => logs.push(message));
      assert.deepEqual(calls, [['view', `@fastang/core@${tag}`, 'version', 'engines', 'peerDependencies', 'peerDependenciesMeta', '--json']]);
    }
    assert.ok(logs.some(line => line.includes('fastang-cli update --to 0.1.0-alpha.2 --yes')));
    for (const args of [[], ['--to', 'file:evil'], ['--to', 'alpha', '--yes', '--dry-run'], ['--force']]) {
      await assert.rejects(updateProject(args, npm, directory), /Usage/);
    }
    await writeFile(join(directory, 'package.json'), JSON.stringify({ workspaces: ['apps/*'], dependencies: { '@fastang/core': 'x' } }));
    await assert.rejects(updateProject(['--to', 'alpha'], npm, directory), /workspace root/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('update applies the resolved exact version and enforces peer and engine compatibility', async () => {
  const calls: string[][] = [];
  const directory = await mkdtemp(join(tmpdir(), 'fastang-apply-'));
  const previous = process.cwd();
  await writeFile(join(directory, 'package.json'), JSON.stringify({ dependencies: { '@fastang/core': '0.1.0-alpha.1' } }));
  await mkdir(join(directory, 'node_modules/@fastang/core'), { recursive: true });
  await writeFile(join(directory, 'node_modules/@fastang/core/package.json'), JSON.stringify({ name: '@fastang/core', version: '0.1.0-alpha.1' }));
  await lockfile(directory, '0.1.0-alpha.1');
  process.chdir(directory);
  try {
  await updateProject(['--to', 'latest', '--yes'], async args => {
    calls.push(args);
    return args[0] === 'view' ? JSON.stringify({ version: '0.1.0-alpha.2' }) : '';
  }, process.cwd(), () => {});
  assert.deepEqual(calls[1], ['install', '--save-prod', '--save-exact', '--engine-strict', '--strict-peer-deps', '@fastang/core@0.1.0-alpha.2']);
  await assert.rejects(updateProject(['--to', 'alpha'], async () => '[]', process.cwd(), () => {}), /single release/);
  } finally { process.chdir(previous); await rm(directory, { recursive: true, force: true }); }
});

test('update distinguishes no-op, downgrade and incompatible peers before installation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fastang-update-policy-'));
  try {
    await writeFile(join(directory, 'package.json'), JSON.stringify({ dependencies: { '@fastang/core': '^1.0.0' } }));
    const core = join(directory, 'node_modules/@fastang/core');
    await mkdir(core, { recursive: true });
    await writeFile(join(core, 'package.json'), JSON.stringify({ name: '@fastang/core', version: '1.2.0' }));
    await lockfile(directory, '1.2.0', '^1.0.0');
    let installs = 0;
    const runner = (metadata: object): NpmRunner => async args => {
      if (args[0] !== 'view') installs++;
      return JSON.stringify(metadata);
    };
    const logs: string[] = [];
    await updateProject(['--to', 'latest', '--yes'], runner({ version: '1.2.0' }), directory, line => logs.push(line));
    assert.ok(logs.includes('Already installed. No changes.'));
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], runner({ version: '1.0.0' }), directory, () => {}), /Downgrade blocked/);
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], runner({ version: '1.3.0', peerDependencies: { 'missing-peer': '^2.0.0' } }), directory, () => {}), /missing-peer must satisfy/);
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], runner({ version: '1.3.0', engines: { node: '<1' } }), directory, () => {}), /Node does not satisfy/);
    await updateProject(['--to', 'latest'], runner({ version: '1.3.0', peerDependencies: { absent: '^1' }, peerDependenciesMeta: { absent: { optional: true } } }), directory, line => logs.push(line));
    assert.ok(logs.some(line => line.includes('absent: not installed — OK')));
    assert.equal(installs, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('npm runner invokes the platform executable and captures complete output', async () => {
  assert.match((await runNpm(['--version'], true)).trim(), /^\d+\.\d+\.\d+/);
});

test('update refuses inconsistent manifest, lockfile and installed state even at the target version', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fastang-state-'));
  try {
    const core = join(directory, 'node_modules/@fastang/core');
    await mkdir(core, { recursive: true });
    await writeFile(join(core, 'package.json'), JSON.stringify({ name: '@fastang/core', version: '1.2.0' }));
    await writeFile(join(directory, 'package.json'), JSON.stringify({ dependencies: { '@fastang/core': '1.2.0' } }));
    const npm: NpmRunner = async args => { assert.equal(args[0], 'view'); return JSON.stringify({ version: '1.2.0' }); };
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], npm, directory, () => {}), /lock.*missing/);
    await lockfile(directory, '1.1.0', '1.2.0');
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], npm, directory, () => {}), /Lockfile and installed core differ/);
    await lockfile(directory, '1.2.0', '1.1.0');
    await assert.rejects(updateProject(['--to', 'latest', '--yes'], npm, directory, () => {}), /declarations differ/);
    const logs: string[] = [];
    await updateProject(['--to', 'latest'], npm, directory, message => logs.push(message));
    assert.ok(logs.some(line => line.includes('declared 1.2.0; locked 1.2.0; installed 1.2.0')));
    assert.ok(!logs.includes('Already installed. No changes.'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

async function pnpmState(directory: string, declared='1.2.0', version='1.2.0(@angular/core@22.2.3)') {
  await mkdir(join(directory,'node_modules/@fastang/core'),{recursive:true});
  await writeFile(join(directory,'node_modules/@fastang/core/package.json'),JSON.stringify({name:'@fastang/core',version:'1.2.0'}));
  await writeFile(join(directory,'package.json'),JSON.stringify({packageManager:'pnpm@11.25.0',dependencies:{'@fastang/core':declared}}));
  await writeFile(join(directory,'pnpm-lock.yaml'),`lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      '@fastang/core':\n        specifier: '${declared}'\n        version: '${version}'\n`);
}
test('pnpm update resolves peer-suffixed versions, preserves plans and applies exact dependencies with strict checks',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'fastang-pnpm-update-'));const previous=process.cwd();
 try{
  await pnpmState(directory);const calls:string[][]=[];const run:NpmRunner=async args=>{calls.push(args);return args[0]==='--version'?'11.25.0':args[0]==='view'?JSON.stringify({version:'1.3.0'}):'';};
  const original=await readFile(join(directory,'pnpm-lock.yaml'),'utf8');const logs:string[]=[];
  await updateProject(['--to','alpha'],run,directory,message=>logs.push(message));assert.ok(logs.includes('Package manager: pnpm'));assert.match(logs.join('\n'),/locked 1.2.0; installed 1.2.0/);assert.equal(await readFile(join(directory,'pnpm-lock.yaml'),'utf8'),original);assert.equal(calls.length,2);
  process.chdir(directory);await updateProject(['--to','latest','--yes'],run,directory,()=>{});assert.deepEqual(calls.at(-1),['add','--save-prod','--save-exact','--config.engine-strict=true','--strict-peer-dependencies','@fastang/core@1.3.0']);
 }finally{process.chdir(previous);await rm(directory,{recursive:true,force:true});}
});
test('pnpm updates reject conflicting managers, malformed locks, workspace locks and stale installed state',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'fastang-pnpm-policy-'));
 const run:NpmRunner=async args=>{assert.ok(['--version','view'].includes(args[0]));return args[0]==='--version'?'10.32.0':JSON.stringify({version:'1.3.0'});};
 try{
  await pnpmState(directory);await lockfile(directory,'1.2.0');await assert.rejects(updateProject(['--to','alpha','--yes'],run,directory,()=>{}),/Multiple.*lockfiles/);await rm(join(directory,'package-lock.json'));
  await writeFile(join(directory,'package.json'),JSON.stringify({packageManager:'npm@11.0.0',dependencies:{'@fastang/core':'1.2.0'}}));await assert.rejects(updateProject(['--to','alpha'],run,directory,()=>{}),/disagree/);
  await pnpmState(directory,'1.2.0','1.1.0');await assert.rejects(updateProject(['--to','alpha','--yes'],run,directory,()=>{}),/Lockfile and installed core differ/);
  await pnpmState(directory,'catalog:');await assert.rejects(updateProject(['--to','alpha','--yes'],run,directory,()=>{}),/registry semver declaration/);
  await pnpmState(directory);await writeFile(join(directory,'pnpm-lock.yaml'),'lockfileVersion: [');await assert.rejects(updateProject(['--to','alpha'],run,directory,()=>{}),/Invalid pnpm-lock/);
  await pnpmState(directory);await writeFile(join(directory,'pnpm-workspace.yaml'),"packages:\n  - apps/*\n");await assert.rejects(updateProject(['--to','alpha'],run,directory,()=>{}),/workspace root/);await rm(join(directory,'pnpm-workspace.yaml'));
  await pnpmState(directory);await appendFile(join(directory,'pnpm-lock.yaml'),'  apps/web: {}\n');await assert.rejects(updateProject(['--to','alpha'],run,directory,()=>{}),/Shared pnpm workspace/);
  await pnpmState(directory);await writeFile(join(directory,'pnpm-lock.yaml'),"lockfileVersion: '6.0'\n");await assert.rejects(updateProject(['--to','alpha','--yes'],run,directory,()=>{}),/Unsupported pnpm lockfile/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('manager selection uses explicit choices for new, project metadata and lockfiles for updates',async()=>{
 const {projectManager,fromUserAgent}=await import('../packages/cli/src/package-manager.ts');
 assert.equal(fromUserAgent('pnpm/11.25.0 npm/? node/v26'),'pnpm');assert.equal(fromUserAgent('npm/11.0.0'),'npm');assert.throws(()=>fromUserAgent('yarn/4.0.0'),/Unsupported/);
 const calls:string[][]=[];await newProject(['my app','--package-manager','pnpm','--no-install'],async args=>{calls.push(args);return '';});assert.deepEqual(calls[0],['dlx',`create-fastang@${await cliVersion()}`,'my app','--package-manager','pnpm','--no-install']);
 await assert.rejects(newProject(['app','--package-manager','yarn'],async()=>''),/npm\|pnpm/);
 const directory=await mkdtemp(join(tmpdir(),'fastang-pnpm-detect-'));try{await pnpmState(directory);assert.equal(await projectManager({},directory),'pnpm');await assert.rejects(projectManager({packageManager:'pnpm@9.15.0'},directory),/Supported pnpm versions/);await assert.rejects(projectManager({packageManager:'yarn@4.0.0'},directory),/Unsupported packageManager/);}finally{await rm(directory,{recursive:true,force:true});}
});
