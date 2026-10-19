import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <h1>Greeting unavailable.</h1>
    <p>The navigation failed. Try a valid name or return to your application.</p>
    <a routerLink="/resources/Ada">Try again</a>
  `,
})
export default class ResourceErrorPage {}
