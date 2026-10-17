import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `<h1>Sign in</h1>
    <p>This example uses one account configured on the server.</p>
    <form (submit)="login($event, password.value)">
      <label for="password">Password</label>
      <input #password id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024">
      <button type="submit" [disabled]="pending()">Sign in</button>
    </form>
    <p role="alert">{{ error() }}</p>
    <a routerLink="/account">Open protected account</a>`,
})
export default class LoginPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly pending = signal(false);
  login(event: Event, password: string) {
    event.preventDefault();
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.http.post('/api/auth/login', { password }, { transferCache: false }).subscribe({
      next: () => { this.pending.set(false); void this.router.navigateByUrl('/account'); },
      error: () => { this.pending.set(false); this.error.set('Sign-in failed. Check your password or try again later.'); },
    });
  }
}
