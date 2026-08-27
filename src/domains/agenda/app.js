import { randomUUID } from 'node:crypto';
import { HttpError } from '../../lib/errors.js';
import { readJson, sendJson } from '../../lib/http.js';
import { verifyInternalRequest } from '../../lib/security.js';
import { futureDate, requiredText, requiredUuid } from '../../lib/validation.js';

export function createAgendaHandler({ repository, internalSecret }) {
  return async ({ request, response, correlationId }) => {
    const path = new URL(request.url, 'http://api-agenda').pathname;
    if (request.method === 'GET' && path === '/health') {
      sendJson(response, 200, { status: 'ok', service: 'api-agenda' });
      return 200;
    }
    if (request.method === 'GET' && path === '/ready') {
      await repository.health();
      sendJson(response, 200, { status: 'ready', service: 'api-agenda' });
      return 200;
    }

    const identity = verifyInternalRequest(request, internalSecret);
    if (!['cliente', 'gestao'].includes(identity.role)) throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
    if (request.method === 'GET' && path === '/agendamentos') {
      sendJson(response, 200, { data: await repository.listAppointments(identity.id, identity.role), correlationId });
      return 200;
    }
    if (request.method === 'POST' && path === '/agendamentos') {
      const body = await readJson(request);
      const appointment = await repository.createAppointment({
        id: randomUUID(),
        clientId: identity.id,
        petId: requiredUuid(body.petId, 'petId'),
        service: requiredText(body.servico, 'servico'),
        time: futureDate(body.horario, 'horario'),
      });
      sendJson(response, 201, { data: appointment, correlationId });
      return 201;
    }
    throw new HttpError(404, 'route_not_found', 'Rota não encontrada');
  };
}
