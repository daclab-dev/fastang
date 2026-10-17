// A fresh process for every startup sample; never connects to a developer server.
import { pathToFileURL } from 'node:url';
const { createProductionServer } = await import(pathToFileURL(process.argv[2]).href);
const server = await createProductionServer();
const address = await server.listen({ host: '127.0.0.1', port: 0 });
process.send({ address });
process.once('message', async () => {
  await server.close();
  process.disconnect();
});
