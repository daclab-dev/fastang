import { inject } from '@angular/core';
import { HttpClient, type HttpContext, type HttpHeaders } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { apiUrl, type ApiContract, type ApiInput, type ApiUrlInput, type ApiSuccess } from './contracts.ts';

export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  withCredentials?: boolean;
  credentials?: RequestCredentials;
  transferCache?: boolean | { includeHeaders?: string[] };
}
type Arguments<C extends ApiContract> = C['schema'] extends { params: unknown } | { querystring: unknown } | { body: unknown }
  ? [input: ApiInput<C>, options?: ApiRequestOptions]
  : [input?: ApiInput<C>, options?: ApiRequestOptions];

/** Thin JSON client: native HttpClient interceptors, errors and transfer cache apply. */
export function createApiClient(http: HttpClient) {
  return {
    request<C extends ApiContract>(contract: C, ...args: Arguments<C>): Observable<ApiSuccess<C>> {
      const [input = {}, options = {}] = args;
      return http.request<ApiSuccess<C>>(contract.method, apiUrl(contract, input as ApiUrlInput<C>), {
        ...options, body: (input as { body?: unknown }).body, observe: 'body', responseType: 'json',
      });
    },
  };
}
/** Call in an Angular injection context, just like inject(HttpClient). */
export function injectApiClient() { return createApiClient(inject(HttpClient)); }
