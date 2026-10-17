import { createApiServer } from '../../framework/server';
import { createNodeHandler } from '../../framework/node-handler';
import { configureServer } from './plugins';

// This entry point deliberately has no Angular renderer dependency.
export default createNodeHandler(() => createApiServer({ configure: configureServer }));
