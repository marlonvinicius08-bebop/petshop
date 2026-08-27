import { readSecret, integerFromEnv } from '../../lib/config.js';
import { createDatabasePool } from '../../lib/database.js';
import { createHttpServer, listen } from '../../lib/http.js';
import { createLogger } from '../../lib/logger.js';
import { createAgendaHandler } from './app.js';
import { createAgendaRepository } from './repository.js';

const logger = createLogger('api-agenda', process.env.LOG_LEVEL);
const pool = createDatabasePool(process.env);
const internalSecret = readSecret({ value: process.env.INTERNAL_SECRET, file: process.env.INTERNAL_SECRET_FILE, name: 'INTERNAL_SECRET' });
const handler = createAgendaHandler({ repository: createAgendaRepository(pool), internalSecret });
listen(createHttpServer({ serviceName: 'api-agenda', logger, handler }), integerFromEnv(process.env.HTTP_PORT, 3000, 'HTTP_PORT'), logger);
