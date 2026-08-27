import assert from 'node:assert/strict';
import test from 'node:test';
import { createFinanceHandler } from '../src/domains/financeiro/app.js';
import { internalHeaders } from '../src/lib/security.js';
import { withServer } from './helpers.js';

const secret = 'internal-secret-for-tests';

function signedHeaders(role) {
  return internalHeaders({
    method: 'GET',
    path: '/resumo',
    correlationId: 'correlation-financeiro',
    timestamp: Date.now(),
    userId: 'usuario-1',
    role,
    origin: 'api-gateway',
  }, secret);
}

test('Financeiro permite resumo somente para gestão', async () => {
  let calls = 0;
  const repository = {
    summary: async () => {
      calls += 1;
      return { receitas: '100.00', despesas: '25.00', saldo: '75.00' };
    },
  };
  await withServer(createFinanceHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const denied = await fetch(`${baseUrl}/resumo`, { headers: signedHeaders('cliente') });
    assert.equal(denied.status, 403);
    assert.equal(calls, 0);

    const allowed = await fetch(`${baseUrl}/resumo`, { headers: signedHeaders('gestao') });
    assert.equal(allowed.status, 200);
    assert.equal(calls, 1);
    assert.deepEqual((await allowed.json()).data, { receitas: '100.00', despesas: '25.00', saldo: '75.00' });
  });
});

