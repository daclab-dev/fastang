import type {
  FastifyInstance, FastifySchema, HTTPMethods, RawReplyDefaultExpression,
  RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface, RouteHandlerMethod,
} from 'fastify';

type Handler<T extends RouteGenericInterface> = RouteHandlerMethod<
  RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, T
>;

// I tipi rimangono nel closure: nessun cast quando si registra la rotta generata.
export function defineApiRoute<T extends RouteGenericInterface>(options: {
  schema: FastifySchema;
  handler: Handler<T>;
}): (app: FastifyInstance, method: HTTPMethods, url: string) => void {
  return (app, method, url) => { app.route<T>({ ...options, method, url }); };
}
