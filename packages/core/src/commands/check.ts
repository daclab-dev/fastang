import { checkRoutes, formatCheck } from '../check.ts';
const args = process.argv.slice(3);
let project: string | undefined;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--project' && args[index + 1] && !args[index + 1].startsWith('-')) project = args[++index];
  else if (!['--json', '--strict', '--quiet'].includes(args[index])) throw new Error('Usage: fastang check [--project tsconfig.node.json] [--json] [--strict] [--quiet]');
}
const result = await checkRoutes({ project, strict: args.includes('--strict') });
if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
else if (!args.includes('--quiet') || result.diagnostics.length) console.log(formatCheck(result));
if (result.diagnostics.some(diagnostic => diagnostic.severity === 'error')) process.exitCode = 1;
