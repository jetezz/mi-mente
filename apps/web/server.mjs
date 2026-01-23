import { handler } from './dist/server/entry.mjs';
import http from 'http';

const server = http.createServer((req, res) => {
  handler(req, res);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
