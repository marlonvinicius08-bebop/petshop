import assert from 'node:assert/strict';
import test from 'node:test';
import { sendJson } from '../src/lib/http.js';
import { withServer } from './helpers.js';

test('servidor expõe métricas sem registrar dados sensíveis', async () => {
  const handler = async ({ response }) => {
    sendJson(response, 200, { status: 'ok' });
    return 200;
  };
  await withServer(handler, async (baseUrl) => {
    await fetch(`${baseUrl}/health`, { headers: { authorization: 'Bearer segredo-que-nao-pode-vazar' } });
    const response = await fetch(`${baseUrl}/metrics`);
    const metrics = await response.text();
    assert.equal(response.status, 200);
    assert.match(metrics, /petshop_http_requests_total/);
    assert.doesNotMatch(metrics, /segredo-que-nao-pode-vazar/);
  });
});
