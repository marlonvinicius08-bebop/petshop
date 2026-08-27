const tokenInput = document.querySelector('#token');
const tokenForm = document.querySelector('#form-token');
const petForm = document.querySelector('#form-pet');
const logout = document.querySelector('#sair');
const status = document.querySelector('#status');
const petList = document.querySelector('#pets');

let accessToken = sessionStorage.getItem('petshop_access_token') ?? '';

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...options.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? 'Falha na requisição');
  return payload;
}

function renderPets(pets) {
  if (pets.length === 0) {
    petList.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'Nenhum pet cadastrado.' }));
    return;
  }
  petList.replaceChildren(...pets.map((pet) => {
    const item = document.createElement('li');
    item.textContent = `${pet.nome} — ${pet.especie}`;
    return item;
  }));
}

async function loadPets() {
  try {
    renderPets((await api('/api/cliente/pets')).data);
    tokenForm.classList.add('hidden');
    logout.classList.remove('hidden');
    status.textContent = 'Sessão ativa.';
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message;
  }
}

tokenForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accessToken = tokenInput.value.trim();
  sessionStorage.setItem('petshop_access_token', accessToken);
  await loadPets();
});

petForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(petForm);
  try {
    await api('/api/cliente/pets', { method: 'POST', body: JSON.stringify({ nome: data.get('nome'), especie: data.get('especie') }) });
    petForm.reset();
    await loadPets();
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message;
  }
});

logout.addEventListener('click', () => {
  sessionStorage.removeItem('petshop_access_token');
  location.reload();
});

if (accessToken) await loadPets();

