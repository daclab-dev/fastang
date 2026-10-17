import { Component, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { RenderContext } from '../shared/render-context';

/** Redirect destinations can be resolved without bundling their page templates. */
@Component({ selector: 'fastang-omitted-route', imports: [RouterOutlet], template: '<router-outlet />' })
export default class OmittedRoute {
  constructor() {
    const context = inject(REQUEST_CONTEXT) as RenderContext | null;
    // A redirect takes precedence over status in the HTTP bridge. An unexpected
    // direct invocation must never turn an omitted page into a blank HTTP 200.
    if (context) context.status = 404;
  }
}
