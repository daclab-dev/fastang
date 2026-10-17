import { Component, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RenderContext } from '@fastang/core';
@Component({ imports: [RouterLink], template: `<h1>Page not found</h1><a routerLink="/">Back home</a>` })
export default class NotFoundPage {
  constructor() { const context = inject(REQUEST_CONTEXT) as RenderContext | null; if (context) context.status = 404; }
}
