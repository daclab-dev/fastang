export interface ApiDispatchResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface RenderContext {
  status: number;
  redirect?: { location: string; status?: 301 | 302 | 303 | 307 | 308 };
  dispatchApi(path: string, method: string, body: unknown, headers: Record<string, string>): Promise<ApiDispatchResult>;
}
