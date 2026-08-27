import assert from 'node:assert/strict';
import test from 'node:test';
import { createPetHandler } from '../src/domains/pet/app.js';
import { internalHeaders } from '../src/lib/security.js';
import { withServer } from './helpers.js';

const secret = 'internal-secret-for-tests';

function signedHeaders(path, overrides = {}) {
  const fields = {
    method: overrides.method ?? 'GET',
    path,
    correlationId: 'correlation-123',
    timestamp: Date.now(),
    userId: overrides.userId ?? 'cliente-1',
    role: overrides.role ?? 'cliente',
    origin: 'api-gateway',
  };
  return internalHeaders(fields, secret);
}

test('API Pet rejeita acesso direto sem identidade interna', async () => {
  const repository = { listPets: async () => [] };
  await withServer(createPetHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/pets`);
    assert.equal(response.status, 401);
  });
});

test('cliente consulta apenas pets associados à própria identidade', async () => {
  let received;
  const repository = {
    listPets: async (userId, role) => {
      received = { userId, role };
      return [{ id: 'pet-1', nome: 'Luna' }];
    },
  };
  await withServer(createPetHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/pets`, { headers: signedHeaders('/pets') });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { userId: 'cliente-1', role: 'cliente' });
  });
});

test('cadastro de pet valida entrada antes de persistir', async () => {
  let persisted = false;
  const repository = { createPet: async () => { persisted = true; } };
  await withServer(createPetHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/pets`, {
      method: 'POST',
      headers: { ...signedHeaders('/pets', { method: 'POST' }), 'content-type': 'application/json' },
      body: JSON.stringify({ nome: '', especie: 'Cão' }),
    });
    assert.equal(response.status, 422);
    assert.equal(persisted, false);
  });
});

