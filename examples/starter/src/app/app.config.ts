import type { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { createRoutes } from './fastang.routes';
export function createAppConfig(): ApplicationConfig {
  return { providers: [provideRouter(createRoutes(), withComponentInputBinding()), provideHttpClient(withFetch()), provideClientHydration(withEventReplay())] };
}
