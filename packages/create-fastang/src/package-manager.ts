export type PackageManager = 'npm' | 'pnpm';
export function packageManager(explicit?: string, agent = process.env['npm_config_user_agent']): PackageManager {
  const manager = explicit ?? agent?.split('/')[0] ?? 'npm';
  if (manager !== 'npm' && manager !== 'pnpm') throw new Error('Supported package managers: npm and pnpm. Use --package-manager npm|pnpm.');
  return manager;
}
export function pnpmVersion(value: string): string {
  if (!/^(10|11)\.\d+\.\d+$/.test(value)) throw new Error('Supported pnpm versions: 10 and 11.');
  return value;
}
