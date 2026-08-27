import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('compose publica somente o reverse proxy e mantém banco sem porta pública', async () => {
  const compose = await readFile(new URL('../compose.yaml', import.meta.url), 'utf8');
  assert.match(compose, /reverse-proxy:[\s\S]*?ports:\s*\n\s*- "8080:8080"/);
  const postgresBlock = compose.slice(compose.indexOf('  postgres:'), compose.indexOf('\nnetworks:'));
  assert.doesNotMatch(postgresBlock, /\n\s+ports:/);
  assert.match(compose, /database_pet:\s*\n\s+internal: true/);
  assert.match(compose, /database_agenda:\s*\n\s+internal: true/);
  assert.match(compose, /database_financeiro:\s*\n\s+internal: true/);
});

test('migração aplica usuários distintos e revoga acesso cruzado', async () => {
  const sql = await readFile(new URL('../infra/postgres/init/sql/schema.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE ROLE app_pet/);
  assert.match(sql, /CREATE ROLE app_agenda/);
  assert.match(sql, /CREATE ROLE app_financeiro/);
  assert.match(sql, /REVOKE ALL ON SCHEMA agenda, financeiro FROM app_pet/);
  assert.doesNotMatch(sql, /GRANT ALL/);
  assert.doesNotMatch(sql, /GRANT [^;]*(UPDATE|DELETE|TRUNCATE)/);
  assert.match(sql, /GRANT SELECT ON financeiro\.lancamentos TO app_financeiro/);
});

test('front-ends conhecem somente rotas externas do gateway', async () => {
  const files = [
    '../apps/web-publica/app.js',
    '../apps/web-cliente/app.js',
    '../apps/web-gestao/app.js',
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /api-(pet|agenda|financeiro)|:3000/);
    assert.match(source, /['`]\/api\//);
  }
});
