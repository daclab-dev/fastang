import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ imports: [RouterLink], template: `
  <p class="eyebrow">ANGULAR + FASTIFY</p><h1>Your next idea starts here.</h1>
  <p>Angular pages, Fastify APIs and server rendering in one project.</p>
  <p><a routerLink="/greet/world">Try a server-rendered API response →</a></p>
  <button (click)="count.update(increment)">Clicked {{ count() }} {{ count() === 1 ? 'time' : 'times' }}</button>
` })
export default class HomePage {
  readonly count = signal(0);
  readonly increment = (value: number) => value + 1;
}
