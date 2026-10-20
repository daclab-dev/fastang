import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { createAppConfig } from './app/app.config';
import './styles.css';
import { Router } from '@angular/router';
import { startSiteAnalytics } from './app/site-analytics';

bootstrapApplication(App, createAppConfig()).then((app) => {
  app.onDestroy(startSiteAnalytics(app.injector.get(Router)));
}).catch(console.error);
