import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.js';

function decodeJson(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(401, 'invalid_token', 'Token inválido');
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyJwt(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = token?.split('.');
  if (parts?.length !== 3) throw new HttpError(401, 'invalid_token', 'Token inválido');
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = decodeJson(encodedHeader);
  const payload = decodeJson(encodedPayload);
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new HttpError(401, 'invalid_token', 'Algoritmo de token não permitido');
  }
  const expected = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  if (!safeEqual(signature, expected)) throw new HttpError(401, 'invalid_token', 'Assinatura inválida');
  if (!payload.sub || !payload.exp || payload.exp <= nowSeconds || (payload.nbf && payload.nbf > nowSeconds)) {
    throw new HttpError(401, 'invalid_token', 'Token expirado ou incompleto');
  }
  const roles = Array.isArray(payload.roles) ? payload.roles.filter((role) => typeof role === 'string') : [];
  return { id: String(payload.sub), roles };
}

export function authenticate(request, secret) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'authentication_required', 'Autenticação obrigatória');
  }
  return verifyJwt(authorization.slice(7), secret);
}

export function requireAnyRole(identity, allowedRoles) {
  const role = identity.roles.find((candidate) => allowedRoles.includes(candidate));
  if (!role) throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
  return role;
}

function internalMessage({ method, path, correlationId, timestamp, userId, role, origin }) {
  return [method, path, correlationId, timestamp, userId, role, origin].join('\n');
}

export function signInternalRequest(fields, secret) {
  return createHmac('sha256', secret).update(internalMessage(fields)).digest('base64url');
}

export function internalHeaders(fields, secret) {
  return {
    'x-correlation-id': fields.correlationId,
    'x-service-timestamp': String(fields.timestamp),
    'x-service-user': fields.userId,
    'x-service-role': fields.role,
    'x-service-origin': fields.origin,
    'x-service-signature': signInternalRequest(fields, secret),
  };
}

export function verifyInternalRequest(request, secret, nowMs = Date.now()) {
  const url = new URL(request.url, 'http://local');
  const fields = {
    method: request.method,
    path: url.pathname,
    correlationId: String(request.headers['x-correlation-id'] ?? ''),
    timestamp: Number(request.headers['x-service-timestamp']),
    userId: String(request.headers['x-service-user'] ?? ''),
    role: String(request.headers['x-service-role'] ?? ''),
    origin: String(request.headers['x-service-origin'] ?? ''),
  };
  if (!fields.correlationId || !fields.userId || !fields.role || fields.origin !== 'api-gateway') {
    throw new HttpError(401, 'invalid_service_identity', 'Identidade interna inválida');
  }
  if (!Number.isFinite(fields.timestamp) || Math.abs(nowMs - fields.timestamp) > 30_000) {
    throw new HttpError(401, 'expired_service_signature', 'Assinatura interna expirada');
  }
  const supplied = String(request.headers['x-service-signature'] ?? '');
  const expected = signInternalRequest(fields, secret);
  if (!safeEqual(supplied, expected)) {
    throw new HttpError(401, 'invalid_service_signature', 'Assinatura interna inválida');
  }
  return { id: fields.userId, role: fields.role };
}
