import { loadConfigFromFile } from 'vite';
import { validateConfig, type FastangConfig } from '../config.ts';

/** Use the same loader and validation before initializing either server or build. */
export async function loadFastangConfig(command: 'serve' | 'build'): Promise<FastangConfig> {
  const loaded = await loadConfigFromFile({ command, mode: command === 'build' ? 'production' : 'development' }, 'fastang.config.ts');
  if (!loaded) throw new Error('Missing fastang.config.ts');
  return validateConfig(loaded.config);
}
