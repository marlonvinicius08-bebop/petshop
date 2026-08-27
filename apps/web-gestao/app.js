const form = document.querySelector('#form-token');
const tokenInput = document.querySelector('#token');
const summary = document.querySelector('#resumo');
const status = document.querySelector('#status');

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = 'Consultando…';
  try {
    const response = await fetch('/api/gestao/financeiro/resumo', {
      headers: { authorization: `Bearer ${tokenInput.value.trim()}`, accept: 'application/json' },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? 'Falha na consulta');
    const cards = [
      ['Receitas', payload.data.receitas],
      ['Despesas', payload.data.despesas],
      ['Saldo', payload.data.saldo],
    ].map(([label, value]) => {
      const card = document.createElement('article');
      card.className = 'card';
      const title = document.createElement('h2');
      title.textContent = label;
      const amount = document.createElement('p');
      amount.textContent = money(value);
      card.append(title, amount);
      return card;
    });
    summary.replaceChildren(...cards);
    status.className = 'status';
    status.textContent = 'Dados atualizados.';
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message;
  }
});

