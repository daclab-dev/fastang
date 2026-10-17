import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createProject } from 'create-fastang';

if (process.argv.length !== 3) throw new Error('Usage: npm run create:auth -- /path/to/new-app');
const project = await createProject({ directory: process.argv[2], cwd: process.cwd() });
await cp(resolve('examples/auth/src'), join(project.directory, 'src'), { recursive: true });
await cp(resolve('examples/auth/scripts'), join(project.directory, 'scripts'), { recursive: true });
const manifest = JSON.parse(await readFile(join(project.directory, 'package.json'), 'utf8'));
manifest.dependencies['@fastify/secure-session'] = '8.4.1';
manifest.dependencies['@fastify/rate-limit'] = '11.2.1';
manifest.scripts['build:vercel'] += ' && node scripts/prepare-vercel.mjs';
await writeFile(join(project.directory, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(join(project.directory, '.env'), [
  'AUTH_SESSION_KEY=' + randomBytes(32).toString('hex'),
  'AUTH_DEMO_PASSWORD=' + randomBytes(24).toString('hex'),
  'AUTH_ORIGIN=http://localhost:3278', 'HOST=127.0.0.1', 'PORT=3278', '',
].join('\n'), { mode: 0o600 });
await cp(resolve('examples/auth/README.md'), join(project.directory, 'AUTH.md'));
await promisify(execFile)('npm', ['install'], { cwd: project.directory, timeout: 180_000, maxBuffer: 8e6 });
console.log(`Created ${project.directory}. Read AUTH.md and retrieve the demo password locally from .env.`);
