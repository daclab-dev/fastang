import { inject, type ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import {
  provideRouter, withComponentInputBinding, withRouterResources,
  withNavigationErrorHandler, RedirectCommand, Router,
} from '@angular/router';
import { createRoutes } from './fastang.routes';

export function createAppConfig(): ApplicationConfig {
  return {
    providers: [
      provideRouter(
        createRoutes(),
        withComponentInputBinding(),
        withRouterResources(),
        // Demo policy: show a dedicated page if a blocking resource fails.
        withNavigationErrorHandler(() =>
          new RedirectCommand(inject(Router).parseUrl('/resource-error')),
        ),
      ),
      provideHttpClient(withFetch()),
      provideClientHydration(),
    ],
  };
}
