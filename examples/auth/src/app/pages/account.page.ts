import { Component, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({ template: `<h1>Your account</h1><p>Welcome, {{ session().user.name }}.</p>
  <button (click)="logout()" [disabled]="pending()">Sign out</button><p role="alert">{{ error() }}</p>` })
export default class AccountPage {
  readonly session = input.required<{ user: { name: string } }>();
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly error = signal('');
  logout() {
    if (this.pending()) return;
    this.pending.set(true);
    this.http.post('/api/auth/logout', {}, { transferCache: false }).subscribe({
      next: () => { this.pending.set(false); void this.router.navigateByUrl('/login'); },
      error: () => { this.pending.set(false); this.error.set('Sign-out failed. Please try again.'); },
    });
  }
}
