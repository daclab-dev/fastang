import type { FastifyInstance, HTTPMethods } from 'fastify';
import type { ApiRouteOptions } from './api.ts';
import type { ApiContract, ApiRouteTypes } from './contracts.ts';

/** Infer handler types and reuse validation/serialization from the shared contract. */
export function defineContractRoute<C extends ApiContract, ContextConfig = Record<string, unknown>>(contract: C, options: Omit<ApiRouteOptions<ApiRouteTypes<C>, ContextConfig>, 'schema'> & { schema?: never }): (app: FastifyInstance, method: HTTPMethods, url: string) => void {
  return (app, method, url) => {
    if (method !== contract.method || url !== contract.path) throw new Error(`API contract mismatch: file route ${method} ${url}, contract ${contract.method} ${contract.path}`);
    app.route<ApiRouteTypes<C>, ContextConfig>({ ...options, method, url, schema: contract.schema });
  };
}
