const list = document.querySelector('#lista-servicos');
const status = document.querySelector('#status');

function serviceCard(service) {
  const article = document.createElement('article');
  article.className = 'card';
  const title = document.createElement('h3');
  title.textContent = service.nome;
  const description = document.createElement('p');
  description.textContent = service.descricao;
  article.append(title, description);
  return article;
}

try {
  const response = await fetch('/api/publico/servicos', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Não foi possível consultar os serviços.');
  const payload = await response.json();
  list.replaceChildren(...payload.data.map(serviceCard));
} catch (error) {
  list.replaceChildren();
  status.className = 'status error';
  status.textContent = error.message;
}
