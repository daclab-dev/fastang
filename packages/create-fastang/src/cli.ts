import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { createProject } from './create.ts';

const help = `Usage: create-fastang <directory> [options]

Create a minimal Angular + Fastify project in a new directory.

  --name <name>          Set the npm package name
  --install              Install dependencies with npm
  --no-install           Generate files only (default)
  --core-package <file>   Use a local @fastang/core .tgz before npm publication
  -h, --help             Show this help
  -v, --version          Show generator version

Example: create-fastang my-app --core-package /tmp/fastang-core-0.1.0-alpha.0.tgz
`;
const quote = (value: string) => /^[a-zA-Z0-9_./-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\"'\"'")}'`;

export async function main(args = process.argv.slice(2)): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) { console.log(help); return; }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version); return;
  }
  let directory: string | undefined;
  let name: string | undefined;
  let corePackage: string | undefined;
  let install = false;
  let installationOption: string | undefined;
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!positional && arg === '--') { positional = true; continue; }
    if (!positional && ['--name', '--core-package'].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      if (arg === '--name') name = value; else corePackage = value;
    } else if (!positional && ['--install', '--no-install'].includes(arg)) {
      if (installationOption && installationOption !== arg) throw new Error('Choose either --install or --no-install.');
      installationOption = arg;
      install = arg === '--install';
    } else if (!positional && arg.startsWith('-')) throw new Error(`Unknown option: ${arg}. Run create-fastang --help.`);
    else if (directory !== undefined) throw new Error('Provide exactly one project directory.');
    else directory = arg;
  }
  if (directory === undefined) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Provide a project directory. Run create-fastang --help.');
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try { directory = (await prompt.question('Project directory (fastang-app): ')).trim() || 'fastang-app'; }
    finally { prompt.close(); }
  }
  const project = await createProject({ directory, name, corePackage });
  console.log(`\nCreated ${project.name} in ${project.directory}`);
  if (install) {
    console.log('\nInstalling dependencies with npm…');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { cwd: project.directory, stdio: 'inherit', shell: process.platform === 'win32' });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error('npm install failed. Project files are preserved; run npm install in the project to retry.')));
    });
  }
  const path = relative(process.cwd(), project.directory) || '.';
  console.log('\nNext steps:');
  console.log(process.platform === 'win32' ? `  Open ${project.directory}` : `  cd ${quote(path.startsWith('-') ? './' + path : path)}`);
  if (!install) console.log('  npm install');
  console.log('  npm run dev\n\nhttp://localhost:3278');
}
