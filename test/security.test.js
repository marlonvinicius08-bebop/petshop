import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../src/lib/errors.js';
import { internalHeaders, verifyJwt } from '../src/lib/security.js';
import { createJwt } from './helpers.js';

test('aceita JWT HS256 válido e preserva somente papéis textuais', () => {
  const token = createJwt({ sub: 'cliente-1', roles: ['cliente', 10], exp: 2_000 }, 'segredo');
  assert.deepEqual(verifyJwt(token, 'segredo', 1_000), { id: 'cliente-1', roles: ['cliente'] });
});

test('rejeita JWT adulterado, expirado ou com algoritmo não permitido', () => {
  const valid = createJwt({ sub: 'cliente-1', roles: ['cliente'], exp: 2_000 }, 'segredo');
  assert.throws(() => verifyJwt(`${valid.slice(0, -1)}x`, 'segredo', 1_000), HttpError);
  assert.throws(() => verifyJwt(createJwt({ sub: 'cliente-1', exp: 900 }, 'segredo'), 'segredo', 1_000), /expirado/);

  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'cliente-1', exp: 2_000 })).toString('base64url');
  assert.throws(() => verifyJwt(`${header}.${payload}.x`, 'segredo', 1_000), /Algoritmo/);
});

test('assinatura interna muda quando identidade ou rota muda', () => {
  const base = {
    method: 'GET',
    path: '/pets',
    correlationId: 'correlation-123',
    timestamp: 1_000,
    userId: 'cliente-1',
    role: 'cliente',
    origin: 'api-gateway',
  };
  const original = internalHeaders(base, 'segredo')['x-service-signature'];
  const changed = internalHeaders({ ...base, path: '/resumo' }, 'segredo')['x-service-signature'];
  assert.notEqual(original, changed);
});
