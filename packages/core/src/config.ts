import { staticFile } from './static-path.ts';

export interface VercelOptions {
  /** Shared functions are the default; routes creates separate deployment functions. */
  functions?: 'shared' | 'routes';
  /** Public prefixes added by the application router, e.g. ['', '/en']. */
  pagePrefixes?: string[];
  /** Keep only the selected page/layout components in route functions. Default: true. */
  prunePages?: boolean;
}

export interface FastangConfig {
  prerender: string[];
  vercel?: VercelOptions;
}

export function defineConfig(config: FastangConfig): FastangConfig {
  return validateConfig(config);
}

function object(value: unknown, field: string, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`Unknown ${field} option: ${key}`);
}

/** Also used by the adapter when invoked without defineConfig. */
export function validateVercelOptions(value: unknown): asserts value is VercelOptions {
  object(value, 'vercel', ['functions', 'pagePrefixes', 'prunePages']);
  if (value.functions !== undefined && value.functions !== 'shared' && value.functions !== 'routes') throw new Error('vercel.functions must be shared or routes');
  if (value.prunePages !== undefined && typeof value.prunePages !== 'boolean') throw new Error('vercel.prunePages must be a boolean');
  if (value.pagePrefixes !== undefined) {
    if (!Array.isArray(value.pagePrefixes) || !value.pagePrefixes.length || value.pagePrefixes.some(prefix => typeof prefix !== 'string' || (prefix !== '' && !/^\/(?:[\w-]+)(?:\/[\w-]+)*$/.test(prefix)))) {
      throw new Error('vercel.pagePrefixes must contain empty or absolute static prefixes without a trailing slash');
    }
    if (value.pagePrefixes.some(prefix => /^\/(?:api|assets|__fastang)(?:\/|$)/.test(prefix))) throw new Error('Reserved Vercel page prefix');
  }
}

/** Validate plain exports too, before the build touches existing output. */
export function validateConfig(value: unknown): FastangConfig {
  object(value, 'FastAng', ['prerender', 'vercel']);
  if (!Array.isArray(value.prerender)) throw new Error('prerender must be an array of URL paths');
  const targets = new Map<string, string>();
  for (const [index, path] of value.prerender.entries()) {
    if (typeof path !== 'string') throw new Error(`prerender[${index}] must be a URL path string`);
    let target: string;
    try { target = staticFile(path); }
    catch { throw new Error(`Invalid prerender[${index}] path: ${JSON.stringify(path)}`); }
    if (path === '/' || /^\/(?:api|assets|__fastang)(?:\/|$)/.test(path)) throw new Error(`Reserved prerender path: ${path}`);
    const previous = targets.get(target);
    if (previous !== undefined && previous !== path) throw new Error(`Conflicting prerender paths: ${previous} and ${path}`);
    targets.set(target, path);
  }
  if (value.vercel !== undefined) validateVercelOptions(value.vercel);
  return value as unknown as FastangConfig;
}
