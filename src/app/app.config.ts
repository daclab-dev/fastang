import { inject, provideAppInitializer, type ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { SiteLanguage, LocalizedTitleStrategy } from './i18n/i18n';
import { createRoutes } from './fastang.routes';

export function createAppConfig(): ApplicationConfig {
  return {
    providers: [
      provideAppInitializer(() => { inject(SiteLanguage).connect(inject(Router)); }),
      { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
      provideRouter([{ path: 'en', children: createRoutes() }, ...createRoutes()], withComponentInputBinding()),
      provideHttpClient(withFetch()),
      provideClientHydration(withEventReplay()),
    ],
  };
}
