import pg from 'pg';
import { readSecret } from './config.js';

export function createDatabasePool(env = process.env) {
  return new pg.Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 5432),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: readSecret({ value: env.DB_PASSWORD, file: env.DB_PASSWORD_FILE, name: 'DB_PASSWORD' }),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: env.SERVICE_NAME,
  });
}

