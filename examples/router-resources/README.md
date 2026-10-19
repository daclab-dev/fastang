# Signal-based route resources

Optional overlay for a FastAng starter using Angular 22.2.3. Angular marks
`withRouterResources` and route `resources` as developer preview. The minimal
starter continues to use stable resolvers; enabling this example is opt-in.

Install `@sinclair/typebox@^0.34.41`, then copy this directory's `src/` over a
starter. It replaces `app.config.ts` and the greeting endpoint, adds the shared
contract and two pages. Preserve your own providers and error policy in an
existing application rather than replacing its configuration blindly.

Build and open `/resources/Ada`. Parameters, query strings and blocking resource
values reach Signal Inputs through `withComponentInputBinding`. `httpResource`
uses HttpClient, so the FastAng SSR bridge and native transfer cache still apply.
The TypeScript response type comes from the contract; the backend validates its
response with the shared schema. This does not add browser-side response validation.

Only changes to `name` reload this resource. `mode=details` changes the view;
other values fall back to `summary`. The example navigation error handler redirects
to `/resource-error` when a blocking resource fails; it is not a generic 404 or
production error policy. `/resources/Ada?preview=blocked` exercises a native guard.
Authentication and authorization belong in the API too.

`npm run test:e2e` checks this overlay with the packaged starter across browser
engines, including hydration, parameter/query navigation, error recovery,
credentialed transfer-cache exclusion and concurrent SSR. It does not establish
support for every Angular resource type or non-blocking resource scenario.
