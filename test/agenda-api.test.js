import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgendaHandler } from '../src/domains/agenda/app.js';
import { internalHeaders } from '../src/lib/security.js';
import { withServer } from './helpers.js';

const secret = 'internal-secret-for-tests';

function signedHeaders(path, overrides = {}) {
  const fields = {
    method: overrides.method ?? 'GET',
    path,
    correlationId: 'correlation-agenda',
    timestamp: Date.now(),
    userId: overrides.userId ?? 'cliente-1',
    role: overrides.role ?? 'cliente',
    origin: 'api-gateway',
  };
  return internalHeaders(fields, secret);
}

test('Agenda limita a consulta à identidade do cliente', async () => {
  let received;
  const repository = {
    listAppointments: async (userId, role) => {
      received = { userId, role };
      return [];
    },
  };
  await withServer(createAgendaHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/agendamentos`, { headers: signedHeaders('/agendamentos') });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { userId: 'cliente-1', role: 'cliente' });
  });
});

test('Agenda rejeita perfil público mesmo com assinatura interna válida', async () => {
  const repository = { listAppointments: async () => [] };
  await withServer(createAgendaHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/agendamentos`, {
      headers: signedHeaders('/agendamentos', { role: 'publico' }),
    });
    assert.equal(response.status, 403);
  });
});

test('Agenda não persiste agendamento com UUID ou horário inválido', async () => {
  let persisted = false;
  const repository = { createAppointment: async () => { persisted = true; } };
  await withServer(createAgendaHandler({ repository, internalSecret: secret }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/agendamentos`, {
      method: 'POST',
      headers: { ...signedHeaders('/agendamentos', { method: 'POST' }), 'content-type': 'application/json' },
      body: JSON.stringify({ petId: 'id-invalido', servico: 'Banho', horario: 'ontem' }),
    });
    assert.equal(response.status, 422);
    assert.equal(persisted, false);
  });
});

