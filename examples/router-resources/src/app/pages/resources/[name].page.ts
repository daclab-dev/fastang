import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ApiSuccess } from '@fastang/core/contracts';
import type { greetingContract } from '../../../shared/greeting';

@Component({
  imports: [RouterLink],
  template: `
    <p class="eyebrow">ROUTER RESOURCES / DEVELOPER PREVIEW</p>
    <h1>{{ greeting().message }}</h1>
    <p>Route parameter: <strong>{{ name() }}</strong></p>
    @if (mode() === 'details') {
      <p data-testid="resource-details">
        A typed contract builds the URL. Angular loads the resource before activation.
      </p>
    }
    <nav aria-label="Reactive greetings">
      <a routerLink="/resources/Ada">Ada</a>
      <a routerLink="/resources/Grace">Grace</a>
      <a [routerLink]="['/resources', name()]" [queryParams]="{ mode: 'details' }">Details</a>
      <a [routerLink]="['/resources', invalidName]">API failure</a>
      <a [routerLink]="['/resources', name()]" [queryParams]="{ preview: 'blocked' }">Redirect</a>
    </nav>
    @if (navigating()) { <p role="status">Loading page…</p> }
  `,
})
export default class ResourceGreetingPage {
  readonly name = input.required<string>();
  readonly greeting = input.required<ApiSuccess<typeof greetingContract>>();
  readonly mode = input('summary', {
    transform: (value: string | undefined) => value === 'details' ? 'details' : 'summary',
  });
  private readonly router = inject(Router);
  readonly navigating = computed(() => this.router.currentNavigation() !== null);
  readonly invalidName = 'a'.repeat(81);
}
