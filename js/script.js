const botaoAgendar = document.querySelector('#agendar');
const mensagem = document.querySelector('#mensagem');

botaoAgendar.addEventListener('click', () => {
  mensagem.textContent = 'Entre em contato para escolher o melhor horário!';
});
