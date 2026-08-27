export function createFinanceRepository(pool) {
  return {
    async health() {
      await pool.query('SELECT 1');
    },
    async summary() {
      const result = await pool.query(`
        SELECT
          COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0)::text AS receitas,
          COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0)::text AS despesas,
          (COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0) -
           COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0))::text AS saldo
        FROM financeiro.lancamentos
      `);
      return result.rows[0];
    },
  };
}
