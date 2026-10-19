export interface ApiDispatchResult {
  status: number;
  body: unknown;
  /** Set-Cookie values remain separate, including Expires commas. */
  headers: Record<string, string | string[]>;
  /** Credentials actually sent to the internal endpoint, including inherited ones. */
  credentialed: boolean;
}

export interface ApiDispatchOptions {
  /** Append internal Set-Cookie headers to this HTML response only. Default: false. */
  forwardSetCookie?: boolean;
  /** Cancel this dispatch independently of the enclosing render. */
  signal?: AbortSignal;
}

export interface RenderContext {
  /** Aborted on render deadline, client disconnect or server shutdown. */
  signal?: AbortSignal;
  status: number;
  redirect?: { location: string; status?: 301 | 302 | 303 | 307 | 308 };
  dispatchApi(path: string, method: string, body: unknown, headers: Record<string, string>, options?: ApiDispatchOptions): Promise<ApiDispatchResult>;
}
