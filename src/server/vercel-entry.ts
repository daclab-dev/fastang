import { createNodeHandler } from '../../framework/node-handler';
import { createProductionServer } from './index';

// Static files and prerendered pages are handled by Vercel's CDN.
export default createNodeHandler(() => createProductionServer({ prerender: false, serveAssets: false }));
