import { HttpError } from '../../lib/errors.js';
import { sendJson } from '../../lib/http.js';
import { verifyInternalRequest } from '../../lib/security.js';

export function createFinanceHandler({ repository, internalSecret }) {
  return async ({ request, response, correlationId }) => {
    const path = new URL(request.url, 'http://api-financeiro').pathname;
    if (request.method === 'GET' && path === '/health') {
      sendJson(response, 200, { status: 'ok', service: 'api-financeiro' });
      return 200;
    }
    if (request.method === 'GET' && path === '/ready') {
      await repository.health();
      sendJson(response, 200, { status: 'ready', service: 'api-financeiro' });
      return 200;
    }

    const identity = verifyInternalRequest(request, internalSecret);
    if (identity.role !== 'gestao') throw new HttpError(403, 'forbidden', 'Acesso não autorizado');
    if (request.method === 'GET' && path === '/resumo') {
      sendJson(response, 200, { data: await repository.summary(), correlationId });
      return 200;
    }
    throw new HttpError(404, 'route_not_found', 'Rota não encontrada');
  };
}
