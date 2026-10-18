import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createProject } from 'create-fastang';

const run = promisify(execFile);
const cli = resolve('packages/create-fastang/bin/create-fastang.mjs');

test('generator creates a complete standalone app with a normalized package name', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'fastang-create-'));
  try {
    const project = await createProject({ directory: 'My App', cwd });
    assert.equal(project.name, 'my-app');
    const manifest = JSON.parse(await readFile(join(project.directory, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'my-app');
    const core = JSON.parse(await readFile(resolve('packages/core/package.json'), 'utf8'));
    assert.equal(manifest.dependencies['@fastang/core'], core.version);
    assert.match(await readFile(join(project.directory, '.gitignore'), 'utf8'), /dist/);
    const files = await readdir(project.directory);
    assert.ok(!files.some(file => ['_gitignore', 'node_modules', '.fastang', 'package-lock.json'].includes(file)));
    assert.match(await readFile(join(project.directory, 'src/server/api/health.get.ts'), 'utf8'), /defineApiRoute/);
    assert.deepEqual(await readdir(cwd), ['My App']);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('generator preserves existing folders, files and symbolic links', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'fastang-create-preserve-'));
  try {
    await mkdir(join(cwd, 'empty'));
    await mkdir(join(cwd, 'existing'));
    await writeFile(join(cwd, 'existing/keep.txt'), 'preserve me');
    await writeFile(join(cwd, 'file'), 'original');
    await symlink(join(cwd, 'existing'), join(cwd, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
    for (const directory of ['empty', 'existing', 'file', 'link', '.']) {
      await assert.rejects(createProject({ directory, cwd }), /Destination already exists/);
    }
    assert.equal(await readFile(join(cwd, 'existing/keep.txt'), 'utf8'), 'preserve me');
    assert.equal(await readFile(join(cwd, 'file'), 'utf8'), 'original');
    assert.deepEqual((await readdir(cwd)).sort(), ['empty', 'existing', 'file', 'link']);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('generator validates names and local packages before writing project files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'fastang-create-options-'));
  try {
    for (const name of ['Uppercase', '../escape', '@scope/', 'node_modules']) {
      await assert.rejects(createProject({ directory: 'app', name, cwd }), /Invalid npm package name/);
    }
    await writeFile(join(cwd, 'not-a-package.txt'), 'test');
    await assert.rejects(createProject({ directory: 'app', cwd, corePackage: 'not-a-package.txt' }), /local npm .tgz/);
    await assert.rejects(createProject({ directory: 'app', cwd, corePackage: 'missing.tgz' }), /ENOENT/);
    const project = await createProject({ directory: 'app', cwd, name: '@example/my-app' });
    assert.equal(project.name, '@example/my-app');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('generator CLI explains usage and rejects malformed commands without writing files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'fastang-create-cli-'));
  try {
    assert.match((await run(process.execPath, [cli, '--help'], { cwd })).stdout, /--core-package/);
    const manifest = JSON.parse(await readFile(resolve('packages/create-fastang/package.json'), 'utf8'));
    assert.equal((await run(process.execPath, [cli, '--version'], { cwd })).stdout.trim(), manifest.version);
    for (const args of [[], ['app', '--wat'], ['app', '--name'], ['app', 'other'], ['app', '--install', '--no-install']]) {
      await assert.rejects(run(process.execPath, [cli, ...args], { cwd }), (error: { code?: number; stderr?: string }) => error.code === 1 && Boolean(error.stderr?.includes('create-fastang:')));
    }
    assert.deepEqual(await readdir(cwd), []);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('pnpm generator produces matching scripts, explicit toolchain policy and manager metadata',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'fastang-create-pnpm-'));
 try{
  for(const version of ['10.32.0','11.25.0']){
   const project=await createProject({directory:'app-'+version,cwd,packageManager:'pnpm',packageManagerVersion:version});
   const manifest=JSON.parse(await readFile(join(project.directory,'package.json'),'utf8'));assert.equal(manifest.packageManager,'pnpm@'+version);assert.match(manifest.scripts.build,/^pnpm run check/);assert.doesNotMatch(Object.values(manifest.scripts).join('\n'),/\bnpm run /);
   const policy=await readFile(join(project.directory,'pnpm-workspace.yaml'),'utf8');assert.match(policy,version.startsWith('10')?/onlyBuiltDependencies:/ : /allowBuilds:/);assert.match(policy,/esbuild/);assert.doesNotMatch(policy,/dangerouslyAllowAllBuilds/);
  }
  const result=await run(process.execPath,[cli,'autodetected','--no-install'],{cwd,env:{...process.env,npm_config_user_agent:'pnpm/11.25.0 npm/? node/v26'}});assert.match(result.stdout,/pnpm install/);assert.match(result.stdout,/pnpm run dev/);assert.equal(JSON.parse(await readFile(join(cwd,'autodetected/package.json'),'utf8')).packageManager,'pnpm@11.25.0');
  for(const args of [['bad','--package-manager','yarn'],['bad','--package-manager'],['bad','--package-manager','pnpm','--package-manager','npm']])await assert.rejects(run(process.execPath,[cli,...args],{cwd}));
 }finally{await rm(cwd,{recursive:true,force:true});}
});
