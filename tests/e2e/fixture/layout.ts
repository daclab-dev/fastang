// Extra links belong only to the browser fixture, not to the distributed starter.
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({
  imports: [RouterLink, RouterOutlet],
  template: `<nav aria-label="Test greetings">
    <a routerLink="/greet/Ada">Ada</a>
    <a routerLink="/greet/Grace">Grace</a>
    <a routerLink="/greet/Ada" [queryParams]="{ preview: 'blocked' }">Redirect</a>
    <a [routerLink]="['/greet', invalidName]">API failure</a>
    <a routerLink="/missing">Missing page</a>
  </nav><router-outlet />`,
})
export default class GreetingLayout { readonly invalidName = 'a'.repeat(81); }
