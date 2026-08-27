import { HttpError } from '../lib/errors.js';
import { readJson, sendJson } from '../lib/http.js';
import { authenticate, internalHeaders, requireAnyRole } from '../lib/security.js';

const routes = [
  { method: 'GET', external: '/api/publico/servicos', service: 'pet', internal: '/servicos', access: 'publico' },
  { method: 'GET', external: '/api/cliente/pets', service: 'pet', internal: '/pets', access: 'cliente' },
  { method: 'POST', external: '/api/cliente/pets', service: 'pet', internal: '/pets', access: 'cliente' },
  { method: 'GET', external: '/api/cliente/agendamentos', service: 'agenda', internal: '/agendamentos', access: 'cliente' },
  { method: 'POST', external: '/api/cliente/agendamentos', service: 'agenda', internal: '/agendamentos', access: 'cliente' },
  { method: 'GET', external: '/api/gestao/financeiro/resumo', service: 'financeiro', internal: '/resumo', access: 'gestao' },
];

export function createRateLimiter({ maximum, windowMs, now = Date.now }) {
  const clients = new Map();
  return (key) => {
    const currentTime = now();
    const current = clients.get(key);
    if (!current || current.resetAt <= currentTime) {
      clients.set(key, { count: 1, resetAt: currentTime + windowMs });
      return;
    }
    current.count += 1;
    if (current.count > maximum) throw new HttpError(429, 'rate_limit_exceeded', 'Limite de requisições excedido');
  };
}

function resolveIdentity(request, access, jwtSecret) {
  if (access === 'publico') return { id: 'anonymous', role: 'publico' };
  const identity = authenticate(request, jwtSecret);
  const allowed = access === 'gestao' ? ['gestao'] : ['cliente', 'gestao'];
  return { id: identity.id, role: requireAnyRole(identity, allowed) };
}

export function createGatewayHandler({
  serviceUrls,
  jwtSecret,
  internalSecret,
  fetchImpl = fetch,
  rateLimiter,
}) {
  return async ({ request, response, correlationId }) => {
    const url = new URL(request.url, 'http://gateway');
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { status: 'ok', service: 'api-gateway' });
      return 200;
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok', service: 'api-gateway', correlationId });
      return 200;
    }

    const clientIp = String(request.headers['x-real-ip'] ?? request.socket.remoteAddress ?? 'unknown');
    rateLimiter(clientIp);

    const route = routes.find((candidate) => candidate.method === request.method && candidate.external === url.pathname);
    if (!route) throw new HttpError(404, 'route_not_found', 'Rota não encontrada');
    const identity = resolveIdentity(request, route.access, jwtSecret);
    const timestamp = Date.now();
    const fields = {
      method: request.method,
      path: route.internal,
      correlationId,
      timestamp,
      userId: identity.id,
      role: identity.role,
      origin: 'api-gateway',
    };

    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') body = JSON.stringify(await readJson(request));

    let upstream;
    try {
      upstream = await fetchImpl(`${serviceUrls[route.service]}${route.internal}`, {
        method: request.method,
        headers: {
          ...internalHeaders(fields, internalSecret),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body,
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new HttpError(502, 'upstream_unavailable', 'Serviço temporariamente indisponível');
    }

    const payload = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'content-length': payload.length,
      'x-correlation-id': correlationId,
    });
    response.end(payload);
    return upstream.status;
  };
}

