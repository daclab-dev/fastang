import { createApiServer } from '@fastang/core/server';
import { createNodeHandler } from '@fastang/core/node-handler';
import { configureServer } from './plugins';
import { registerApi } from '../../.fastang/api';

// This entry point deliberately has no Angular renderer dependency.
export default createNodeHandler(() => createApiServer({ configure: configureServer, registerApi }));
