import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { createAppConfig } from './app/app.config';
import './styles.css';

bootstrapApplication(App, createAppConfig()).catch(console.error);
