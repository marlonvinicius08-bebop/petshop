import { randomUUID } from 'node:crypto';
import { HttpError } from '../../lib/errors.js';
import { readJson, sendJson } from '../../lib/http.js';
import { verifyInternalRequest } from '../../lib/security.js';
import { requiredText } from '../../lib/validation.js';

export function createPetHandler({ repository, internalSecret }) {
  return async ({ request, response, correlationId }) => {
    const path = new URL(request.url, 'http://api-pet').pathname;
    if (request.method === 'GET' && path === '/health') {
      sendJson(response, 200, { status: 'ok', service: 'api-pet' });
      return 200;
    }
    if (request.method === 'GET' && path === '/ready') {
      await repository.health();
      sendJson(response, 200, { status: 'ready', service: 'api-pet' });
      return 200;
    }

    const identity = verifyInternalRequest(request, internalSecret);
    if (request.method === 'GET' && path === '/servicos') {
      if (!['publico', 'cliente', 'gestao'].includes(identity.role)) throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
      sendJson(response, 200, { data: await repository.listServices(), correlationId });
      return 200;
    }
    if (request.method === 'GET' && path === '/pets') {
      if (!['cliente', 'gestao'].includes(identity.role)) throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
      sendJson(response, 200, { data: await repository.listPets(identity.id, identity.role), correlationId });
      return 200;
    }
    if (request.method === 'POST' && path === '/pets') {
      if (!['cliente', 'gestao'].includes(identity.role)) throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
      const body = await readJson(request);
      const pet = await repository.createPet({
        id: randomUUID(),
        tutorId: identity.id,
        nome: requiredText(body.nome, 'nome'),
        especie: requiredText(body.especie, 'especie', 50),
      });
      sendJson(response, 201, { data: pet, correlationId });
      return 201;
    }
    throw new HttpError(404, 'route_not_found', 'Rota não encontrada');
  };
}
