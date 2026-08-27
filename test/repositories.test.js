import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgendaRepository } from '../src/domains/agenda/repository.js';
import { createFinanceRepository } from '../src/domains/financeiro/repository.js';
import { createPetRepository } from '../src/domains/pet/repository.js';

function recordingPool(rows = []) {
  const calls = [];
  return {
    calls,
    async query(query) {
      calls.push(query);
      return { rows };
    },
  };
}

test('repositório Pet parametriza tutor e não concatena identidade no SQL', async () => {
  const pool = recordingPool([]);
  await createPetRepository(pool).listPets("cliente'; DROP TABLE pet.pets;--", 'cliente');
  assert.match(pool.calls[0].text, /tutor_id = \$1/);
  assert.deepEqual(pool.calls[0].values, ["cliente'; DROP TABLE pet.pets;--"]);
  assert.doesNotMatch(pool.calls[0].text, /DROP TABLE/);
});

test('repositório Agenda parametriza todos os valores de escrita', async () => {
  const pool = recordingPool([{ id: 'appointment-1' }]);
  const appointment = { id: 'appointment-1', clientId: 'client-1', petId: 'pet-1', service: 'Banho', time: new Date() };
  await createAgendaRepository(pool).createAppointment(appointment);
  assert.match(pool.calls[0].text, /VALUES \(\$1, \$2, \$3, \$4, \$5\)/);
  assert.deepEqual(pool.calls[0].values, Object.values(appointment));
});

test('repositório Financeiro calcula resumo sem receber SQL do usuário', async () => {
  const pool = recordingPool([{ receitas: '10.00', despesas: '2.00', saldo: '8.00' }]);
  const summary = await createFinanceRepository(pool).summary();
  assert.deepEqual(summary, { receitas: '10.00', despesas: '2.00', saldo: '8.00' });
  assert.equal(typeof pool.calls[0], 'string');
  assert.match(pool.calls[0], /FROM financeiro\.lancamentos/);
});
