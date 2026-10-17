# Pages, routing and layouts

Define the structure with files and use Angular routing for metadata, guards and resolvers.

## File conventions

Page components export a class as default. The starter configures `provideRouter` with `withComponentInputBinding()`, so route parameters and resolved data can reach component inputs.

| File in src/app/pages | URL |
| --- | --- |
| `index.page.ts` | `/` |
| `about.page.ts` | `/about` |
| `greet/[name].page.ts` | `/greet/:name` |
| `(public)/help.page.ts` | `/help` |
| `[...slug].page.ts` | Terminal catch-all |

Parenthesized directories organize code without adding a URL segment. Static routes precede dynamic routes. The generator rejects equivalent paths and duplicate parameters.

## Add a layout

Create this file in the starter. The layout wraps `/greet/world` and stays active while navigating between its child pages.

```ts file=src/app/pages/greet/layout.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  template: '<section aria-label="Greetings"><h2>Greetings</h2><router-outlet /></section>',
})
export default class GreetingLayout {}
```

A layout must include `RouterOutlet` to display its child page. You can nest more `layout.ts` files; `layout.route.ts` configures layout metadata.

## Page metadata

The adjacent `greet/[name].route.ts` exports Angular metadata. The path, component and hierarchy are generated: do not define them in metadata. Use `title`, `resolve`, `providers`, `canActivate` and `runGuardsAndResolvers` to configure route behavior.

Use `RouterLink` for internal navigation. Do not edit `src/app/fastang.routes.ts`: it is generated. `npm run generate` refreshes the manifest explicitly; the dev server detects added and removed route files.

## Per-request state

Do not keep request or user data in module variables. Use a factory for mutable route providers, for example `useFactory: () => ({ count: 0 })`. FastAng creates fresh route objects for every SSR application.

Continue with [data loading and rendering](rendering.md). See [Angular routing](https://angular.dev/guide/routing) for standard router behavior.
