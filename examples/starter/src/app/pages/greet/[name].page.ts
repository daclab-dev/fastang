import { Component, input } from '@angular/core';
@Component({ template: `<p class="eyebrow">SERVER RENDERED</p><h1>{{ greeting().message }}</h1><p>The Angular resolver calls a validated Fastify endpoint. Hydration reuses its response.</p>` })
export default class GreetingPage { readonly greeting = input.required<{ message: string }>(); }
