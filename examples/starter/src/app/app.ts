import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({ selector: 'app-root', imports: [RouterLink, RouterOutlet], template: `
  <header><a routerLink="/">FastAng</a><nav><a routerLink="/about">About</a><a routerLink="/greet/world">SSR + API</a></nav></header>
  <main><router-outlet /></main>
` })
export class App {}
