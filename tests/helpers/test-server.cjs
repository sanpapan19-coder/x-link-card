/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('node:path');
const http = require('node:http');
const next = require('next');

const app = next({ dev: false, dir: path.resolve(__dirname, '../..') });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  const server = http.createServer(handle);
  server.listen(0, '127.0.0.1', () => {
    process.send({ port: server.address().port });
  });
  process.on('message', async (message) => {
    if (message !== 'stop') return;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await app.close();
    process.exit(0);
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
