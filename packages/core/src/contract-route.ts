import type { FastifyInstance, HTTPMethods, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault, RouteHandlerMethod } from 'fastify';
import type { ApiContract, ApiRouteTypes } from './contracts.ts';

/** Infer handler types and reuse validation/serialization from the shared contract. */
export function defineContractRoute<C extends ApiContract>(contract: C, options: {
  handler: RouteHandlerMethod<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ApiRouteTypes<C>>;
}): (app: FastifyInstance, method: HTTPMethods, url: string) => void {
  return (app, method, url) => {
    if (method !== contract.method || url !== contract.path) throw new Error(`API contract mismatch: file route ${method} ${url}, contract ${contract.method} ${contract.path}`);
    app.route<ApiRouteTypes<C>>({ ...options, method, url, schema: contract.schema });
  };
}
