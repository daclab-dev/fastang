import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, DestroyRef, PendingTasks, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { createRenderer } from '@fastang/core/angular';
import { createServer } from '@fastang/core/server';

test('deadline destroys a zoneless Angular application waiting for stability', { timeout: 5_000 }, async () => {
  let destroyed!: () => void;
  const disposed = new Promise<void>(resolve => { destroyed = resolve; });
  const SlowApp = Component({ selector: 'app-root', template: '<p>slow</p>' })(class {
    constructor() {
      const cleanup = inject(PendingTasks).add();
      inject(DestroyRef).onDestroy(() => { cleanup(); destroyed(); });
    }
  });
  const app = await createServer({
    renderTimeoutMs: 150,
    template: async () => '<html><body><app-root></app-root></body></html>',
    render: createRenderer(SlowApp, () => ({ providers: [provideRouter([]), provideHttpClient()] })),
  });
  try {
    const response = await app.inject('/');
    assert.equal(response.statusCode, 504);
    await disposed;
  } finally { await app.close(); }
});


test('cancellation during an asynchronous initializer releases its request injector', { timeout: 5_000 }, async () => {
  let destroyed!: () => void;
  const disposed = new Promise<void>(resolve => { destroyed = resolve; });
  const App = Component({ selector: 'app-root', template: '<p>ready</p>' })(class {});
  const app = await createServer({
    renderTimeoutMs: 150,
    template: async () => '<html><body><app-root></app-root></body></html>',
    render: createRenderer(App, () => ({ providers: [provideRouter([]), provideHttpClient(),
      provideAppInitializer(() => {
        inject(DestroyRef).onDestroy(destroyed);
        return new Promise<void>(() => {});
      }),
    ] })),
  });
  try {
    assert.equal((await app.inject('/')).statusCode, 504);
    await disposed;
  } finally { await app.close(); }
});
