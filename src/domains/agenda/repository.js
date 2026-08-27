export function createAgendaRepository(pool) {
  return {
    async health() {
      await pool.query('SELECT 1');
    },
    async listAppointments(userId, role) {
      const query = role === 'gestao'
        ? { text: 'SELECT id, cliente_id, pet_id, servico, horario, status, criado_em FROM agenda.agendamentos ORDER BY horario', values: [] }
        : { text: 'SELECT id, cliente_id, pet_id, servico, horario, status, criado_em FROM agenda.agendamentos WHERE cliente_id = $1 ORDER BY horario', values: [userId] };
      return (await pool.query(query)).rows;
    },
    async createAppointment(appointment) {
      const result = await pool.query({
        text: `INSERT INTO agenda.agendamentos (id, cliente_id, pet_id, servico, horario)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id, cliente_id, pet_id, servico, horario, status, criado_em`,
        values: [appointment.id, appointment.clientId, appointment.petId, appointment.service, appointment.time],
      });
      return result.rows[0];
    },
  };
}
