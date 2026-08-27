export function createPetRepository(pool) {
  return {
    async health() {
      await pool.query('SELECT 1');
    },
    async listServices() {
      const result = await pool.query(
        'SELECT id, nome, descricao FROM pet.servicos WHERE ativo = true ORDER BY id',
      );
      return result.rows;
    },
    async listPets(userId, role) {
      const query = role === 'gestao'
        ? { text: 'SELECT id, tutor_id, nome, especie, criado_em FROM pet.pets ORDER BY criado_em DESC', values: [] }
        : { text: 'SELECT id, tutor_id, nome, especie, criado_em FROM pet.pets WHERE tutor_id = $1 ORDER BY criado_em DESC', values: [userId] };
      return (await pool.query(query)).rows;
    },
    async createPet(pet) {
      const result = await pool.query({
        text: `INSERT INTO pet.pets (id, tutor_id, nome, especie)
               VALUES ($1, $2, $3, $4)
               RETURNING id, tutor_id, nome, especie, criado_em`,
        values: [pet.id, pet.tutorId, pet.nome, pet.especie],
      });
      return result.rows[0];
    },
  };
}

