import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import logo from '../../assets/fastang-logo.webp';

@Component({
  imports: [RouterLink],
  template: `
    <section class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">ANGULAR + FASTIFY</p>
        <h1>Your next idea starts here.</h1>
        <p class="welcome-description">
          Angular pages, Fastify APIs and server rendering in one project.
          Your workspace is ready. Make it yours.
        </p>
        <a class="welcome-link" routerLink="/greet/world">
          Try a server-rendered API response <span aria-hidden="true">↗</span>
        </a>
        <div class="welcome-interaction">
          <button (click)="count.update(increment)">
            Clicked {{ count() }} {{ count() === 1 ? 'time' : 'times' }}
          </button>
          <span>Go ahead. Angular is already interactive.</span>
        </div>
      </div>
      <div class="welcome-art">
        <div class="logo-glow" aria-hidden="true"></div>
        <div class="logo-float">
          <span class="logo-orbit orbit-back" aria-hidden="true"></span>
          <img [src]="logo" width="440" height="440" alt="FastAng shield" fetchpriority="high">
          <span class="logo-orbit orbit-front" aria-hidden="true"></span>
        </div>
        <p class="art-caption">SOLID ANGULAR. FASTIFY ENERGY.</p>
      </div>
    </section>
    <section class="welcome-next" aria-label="Explore your project">
      <a routerLink="/greet/world"><span>01 / SERVER</span><strong>Meet your API</strong><small>Follow data from Fastify to an Angular page. ↗</small></a>
      <a routerLink="/about"><span>02 / BUILD</span><strong>Start with static</strong><small>A page prerendered during production builds. ↗</small></a>
      <a href="https://fastang.dev/en/docs/getting-started"><span>03 / YOUR NEXT STEP</span><strong>Build something yours</strong><small>Routing, typed APIs and deployment guides. ↗</small></a>
    </section>
  `,
})
export default class HomePage {
  readonly logo = logo;
  readonly count = signal(0);
  readonly increment = (value: number) => value + 1;
}
