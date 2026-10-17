import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listen } from '../../framework/listen';
import { createProductionServer } from './index';

export { createProductionServer };

// Kept in the executable entry, so code splitting cannot move this check to a shared chunk.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await listen(await createProductionServer({ logger: true }));
}
