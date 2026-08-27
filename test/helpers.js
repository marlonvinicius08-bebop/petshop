import { createHmac } from 'node:crypto';
import { createHttpServer } from '../src/lib/http.js';

export const quietLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export async function withServer(handler, callback) {
  const server = createHttpServer({ serviceName: 'test', logger: quietLogger, handler });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

export function createJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

