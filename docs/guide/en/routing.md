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

## Inspect the route map

From an application using `0.1.0-alpha.2` or later, run:

```sh
npx fastang routes
npx fastang routes --json
```

The text view lists pages in matching order with their source files, ancestor
layouts and route metadata, followed by API methods. JSON returns a
`schemaVersion: 1` document with `pages` and `api` arrays; each page includes its
`layouts` in outermost-to-innermost order. File paths are relative to the app.

Inspection reads file names without executing application code, generating files
or starting a server. Ambiguous routes and orphan metadata fail with the same
errors as generation. This is the file-based map: prefixes added by your Angular
router, plugin routes and implicit HEAD routes are not shown. It does not infer
rendering or deployment rules. The command is available from `0.1.0-alpha.2`.
