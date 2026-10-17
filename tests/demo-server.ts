import { createApiServer as apiServer, createServer as server, type ServerOptions } from '@fastang/core/server';
import { registerApi } from '../.fastang/api';
export * from '@fastang/core/server';
// Bind the demo API manifest explicitly when testing the reusable runtime.
export const createApiServer = (options: Parameters<typeof apiServer>[0] = {}) => apiServer({ registerApi, ...options });
export const createServer = (options: ServerOptions) => server({ registerApi, ...options });
