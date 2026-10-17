import type { Static, TSchema } from '@sinclair/typebox';

export interface ApiSchemas {
  params?: TSchema;
  querystring?: TSchema;
  body?: TSchema;
  response: Record<number, TSchema>;
}
export interface ApiContract<S extends ApiSchemas = ApiSchemas> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  schema: S;
}
type Field<S, K extends PropertyKey> = S extends Record<K, infer T extends TSchema> ? Static<T> : never;
type InputFields<C extends ApiContract> =
  (C['schema'] extends { params: TSchema } ? { params: Field<C['schema'], 'params'> } : {}) &
  (C['schema'] extends { querystring: TSchema } ? { query: Field<C['schema'], 'querystring'> } : {}) &
  (C['schema'] extends { body: TSchema } ? { body: Field<C['schema'], 'body'> } : {});
export type ApiInput<C extends ApiContract> = keyof InputFields<C> extends never ? Record<string, never> : InputFields<C>;
type UrlFields<C extends ApiContract> = Pick<InputFields<C>, Extract<keyof InputFields<C>, 'params' | 'query'>>;
export type ApiUrlInput<C extends ApiContract> = keyof UrlFields<C> extends never ? Record<string, never> : UrlFields<C>;
export type ApiReply<C extends ApiContract> = {
  [K in keyof C['schema']['response']]: C['schema']['response'][K] extends TSchema ? Static<C['schema']['response'][K]> : never
};
export type ApiSuccess<C extends ApiContract> = {
  [K in keyof ApiReply<C>]: K extends string | number ? `${K}` extends `2${string}` ? ApiReply<C>[K] : never : never
}[keyof ApiReply<C>];
export type ApiRouteTypes<C extends ApiContract> = {
  Params: Field<C['schema'], 'params'>;
  Querystring: Field<C['schema'], 'querystring'>;
  Body: Field<C['schema'], 'body'>;
  Reply: ApiReply<C>;
};

const pathPattern = /^\/api\/(?:[\w-]+|:[a-zA-Z_]\w*)(?:\/(?:[\w-]+|:[a-zA-Z_]\w*))*$/;

/** Public JSON schemas only: do not import a server handler into a contract module. */
export function defineApiContract<const S extends ApiSchemas>(contract: ApiContract<S>): ApiContract<S> {
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(contract.method)) throw new Error('Unsupported contract method');
  if (!pathPattern.test(contract.path)) throw new Error('Contract path must be a local /api/... path with static or named segments');
  const parameters = contract.path.split('/').filter(part => part.startsWith(':')).map(part => part.slice(1));
  const schema = contract.schema.params;
  if (schema && schema.type !== 'object') throw new Error('schema.params must be an object schema');
  const properties = Object.keys(schema?.properties ?? {});
  if (new Set(parameters).size !== parameters.length || parameters.length !== properties.length || parameters.some(name => !properties.includes(name) || !schema?.required?.includes(name))) {
    throw new Error('Contract path parameters must match required schema.params properties');
  }
  if (contract.method === 'GET' && contract.schema.body) throw new Error('GET contracts do not support bodies');
  if (!Object.keys(contract.schema.response).some(status => /^2\d\d$/.test(status)) || Object.keys(contract.schema.response).some(status => !/^[1-5]\d\d$/.test(status))) throw new Error('Contract response schemas need HTTP statuses and at least one 2xx response');
  return contract;
}

/** Encodes scalar path values and flat query values; never stringifies objects. */
export function apiUrl<C extends ApiContract>(contract: C, input: ApiUrlInput<C>): string {
  if (!pathPattern.test(contract.path)) throw new Error('Invalid local API contract path');
  const values = input as { params?: Record<string, unknown>; query?: Record<string, unknown> };
  const names = contract.path.split('/').filter(part => part.startsWith(':')).map(part => part.slice(1));
  if (Object.keys(values.params ?? {}).some(name => !names.includes(name))) throw new Error('Unknown API path parameter');
  const scalar = (value: unknown): string => {
    if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return String(value);
    throw new Error('API URL values must be strings, finite numbers or booleans');
  };
  const path = contract.path.split('/').map(part => {
    if (!part.startsWith(':')) return part;
    const value = scalar(values.params?.[part.slice(1)]);
    if (!value || value === '.' || value === '..') throw new Error('Empty or dot path parameters are not supported');
    return encodeURIComponent(value);
  }).join('/');
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values.query ?? {})) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, scalar(item));
  }
  return path + (query.size ? '?' + query.toString() : '');
}
