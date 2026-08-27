import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const role = process.argv[2] ?? 'cliente';
const subject = process.argv[3] ?? 'usuario-local';
if (!['cliente', 'gestao'].includes(role)) {
  console.error('Uso: node scripts/create-dev-token.js [cliente|gestao] [identificador]');
  process.exit(1);
}

const secretPath = process.env.JWT_SECRET_FILE ?? 'secrets/jwt_secret';
const secret = readFileSync(secretPath, 'utf8').trim();
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  sub: subject,
  roles: [role],
  exp: Math.floor(Date.now() / 1000) + 3_600,
})).toString('base64url');
const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

console.log(`${header}.${payload}.${signature}`);

