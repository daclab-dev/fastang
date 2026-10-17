import { createRenderer } from '@fastang/core/angular';
import { App } from './app/app';
import { createAppConfig } from './app/app.config';

export const render = createRenderer(App, createAppConfig);
