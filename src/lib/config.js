import { readFileSync } from 'node:fs';

export function readSecret({ value, file, name }) {
  if (value) return value;
  if (!file) throw new Error(`O secret ${name} não foi configurado`);
  return readFileSync(file, 'utf8').trim();
}

export function integerFromEnv(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser um número inteiro positivo`);
  }
  return parsed;
}

