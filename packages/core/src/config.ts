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
  return config;
}
