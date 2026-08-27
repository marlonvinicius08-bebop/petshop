import assert from 'node:assert/strict';
import test from 'node:test';
import { createGatewayHandler, createRateLimiter } from '../src/gateway/app.js';
import { createJwt, withServer } from './helpers.js';

const jwtSecret = 'jwt-secret-for-tests';
const internalSecret = 'internal-secret-for-tests';

function handlerWith(fetchImpl, maximum = 100) {
  return createGatewayHandler({
    serviceUrls: { pet: 'http://pet', agenda: 'http://agenda', financeiro: 'http://financeiro' },
    jwtSecret,
    internalSecret,
    fetchImpl,
    rateLimiter: createRateLimiter({ maximum, windowMs: 60_000 }),
  });
}

test('rota pública passa somente pelo gateway e propaga correlation ID assinado', async () => {
  let forwarded;
  const handler = handlerWith(async (url, options) => {
    forwarded = { url, options };
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/publico/servicos`, { headers: { 'x-correlation-id': 'correlation-123' } });
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, 'http://pet/servicos');
    assert.equal(forwarded.options.headers['x-service-role'], 'publico');
    assert.equal(forwarded.options.headers['x-correlation-id'], 'correlation-123');
    assert.ok(forwarded.options.headers['x-service-signature']);
  });
});

test('rota de cliente exige autenticação e papel permitido', async () => {
  const handler = handlerWith(async () => new Response('{}'));
  await withServer(handler, async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/cliente/pets`);
    assert.equal(missing.status, 401);

    const token = createJwt({ sub: 'user-1', roles: ['visitante'], exp: Math.floor(Date.now() / 1000) + 60 }, jwtSecret);
    const forbidden = await fetch(`${baseUrl}/api/cliente/pets`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(forbidden.status, 403);
  });
});

test('rota de gestão não aceita papel de cliente', async () => {
  const handler = handlerWith(async () => new Response('{}'));
  await withServer(handler, async (baseUrl) => {
    const token = createJwt({ sub: 'user-1', roles: ['cliente'], exp: Math.floor(Date.now() / 1000) + 60 }, jwtSecret);
    const response = await fetch(`${baseUrl}/api/gestao/financeiro/resumo`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 403);
  });
});

test('rate limit bloqueia excesso de requisições', async () => {
  const handler = handlerWith(async () => new Response(JSON.stringify({ data: [] })), 1);
  await withServer(handler, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/publico/servicos`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/publico/servicos`)).status, 429);
  });
});

