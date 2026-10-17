import type {
  FastifyInstance, HTTPMethods, RawReplyDefaultExpression,
  RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface, RouteOptions,
} from 'fastify';

/** Native Fastify route options; the file convention owns method and URL. */
export type ApiRouteOptions<T extends RouteGenericInterface = RouteGenericInterface, ContextConfig = Record<string, unknown>> = Omit<
  RouteOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, T, ContextConfig>,
  'method' | 'url'
> & { method?: never; url?: never };

export function defineApiRoute<T extends RouteGenericInterface, ContextConfig = Record<string, unknown>>(options: ApiRouteOptions<T, ContextConfig>): (app: FastifyInstance, method: HTTPMethods, url: string) => void {
  return (app, method, url) => { app.route<T, ContextConfig>({ ...options, method, url }); };
}
