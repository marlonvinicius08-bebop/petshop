import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { HttpError } from './errors.js';
import { Metrics } from './metrics.js';

const correlationPattern = /^[a-zA-Z0-9._-]{8,128}$/;

export function getCorrelationId(request) {
  const supplied = request.headers['x-correlation-id'];
  return typeof supplied === 'string' && correlationPattern.test(supplied)
    ? supplied
    : randomUUID();
}

export async function readJson(request, limit = 32_768) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'payload_too_large', 'Corpo da requisição muito grande');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON inválido');
  }
}

export function sendJson(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...headers,
  });
  response.end(payload);
}

export function createHttpServer({ serviceName, logger, handler }) {
  const metrics = new Metrics(serviceName);
  return createServer(async (request, response) => {
    const startedAt = performance.now();
    const correlationId = getCorrelationId(request);
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-content-type-options', 'nosniff');

    let status = 500;
    try {
      if (request.method === 'GET' && new URL(request.url, 'http://local').pathname === '/metrics') {
        const payload = metrics.render();
        response.writeHead(200, {
          'content-type': 'text/plain; version=0.0.4; charset=utf-8',
          'content-length': Buffer.byteLength(payload),
        });
        response.end(payload);
        status = 200;
        return;
      }
      status = (await handler({ request, response, correlationId })) ?? response.statusCode;
    } catch (error) {
      status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'internal_error';
      const message = error instanceof HttpError ? error.message : 'Erro interno';
      if (!response.headersSent) sendJson(response, status, { error: { code, message }, correlationId });
      else response.end();
      if (!(error instanceof HttpError)) {
        logger.error('request_error', { correlationId, error: error.message });
      }
    } finally {
      metrics.record(request.method, status);
      logger.info('request_completed', {
        correlationId,
        method: request.method,
        path: new URL(request.url, 'http://local').pathname,
        status,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      });
    }
  }).on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });
}

export function listen(server, port, logger) {
  server.listen(port, '0.0.0.0', () => logger.info('service_started', { port }));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
