import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const manifests = await Promise.all(['core', 'create-fastang', 'cli'].map(async directory => ({
  directory, ...JSON.parse(await readFile(`packages/${directory}/package.json`, 'utf8')),
})));
const version = manifests[0].version;
assert.match(version, /^\d+\.\d+\.\d+-alpha\.\d+$/, 'Alpha releases require an explicit prerelease version');
const output = resolve('.fastang/releases', version);
await mkdir(output, { recursive: true });
const packages = [];
for (const manifest of manifests) {
  assert.equal(manifest.version, version, 'Core, generator and CLI versions must match');
  assert.equal(manifest.publishConfig.access, 'public');
  assert.equal(manifest.publishConfig.tag, 'alpha');
  assert.equal(manifest.publishConfig.registry, 'https://registry.npmjs.org/');
  assert.equal(manifest.private, undefined);
  const { stdout } = await run('npm', ['pack', '--workspace', manifest.name, '--pack-destination', output, '--json'], { maxBuffer: 4 * 1024 * 1024 });
  const result = JSON.parse(stdout);
  const packed = Array.isArray(result) ? result[0] : result[manifest.name];
  const paths: string[] = packed.files.map((file: { path: string }) => file.path);
  for (const required of ['LICENSE', 'README.md', 'CHANGELOG.md']) assert.ok(paths.includes(required), `${manifest.name}: missing ${required}`);
  assert.ok(paths.some(path => path.endsWith('.d.ts')), 'Type declarations must be included');
  for (const path of paths) {
    assert.ok(!/(^|\/)(node_modules|\.env(?:\..*)?|\.npmrc|\.git|\.aws|\.codex|\.agents)(\/|$)/.test(path), `Unexpected private file: ${path}`);
    assert.ok(!/\.(pem|key|p12|pfx)$/.test(path), `Unexpected key file: ${path}`);
    if (manifest.directory === 'core') assert.ok(!path.startsWith('src/'), 'Core ships compiled code');
  }
  if (manifest.directory === 'create-fastang') {
    const template = JSON.parse(await readFile('packages/create-fastang/template/package.json', 'utf8'));
    assert.equal(template.dependencies[manifests[0].name], version, 'Template must pin the released core');
    assert.ok(paths.includes('template/_gitignore'));
    assert.ok(!paths.some(path => /fastang.routes.ts|package-lock.json/.test(path)));
  }
  const file = resolve(output, packed.filename);
  const integrity = 'sha512-' + createHash('sha512').update(await readFile(file)).digest('base64');
  assert.equal(integrity, packed.integrity, 'Tarball integrity must match npm metadata');
  packages.push({ name: manifest.name, version, file: relative(process.cwd(), file), integrity, files: paths.length, bytes: packed.size });
}
const { stdout: commit } = await run('git', ['rev-parse', 'HEAD']);
const { stdout: changes } = await run('git', ['status', '--porcelain']);
const release = { version, tag: 'alpha', registry: 'https://registry.npmjs.org/', commit: commit.trim(), cleanWorkingTree: changes.trim() === '', packages };
await writeFile(resolve(output, 'release.json'), JSON.stringify(release, null, 2) + '\n');
console.log(JSON.stringify(release, null, 2));
