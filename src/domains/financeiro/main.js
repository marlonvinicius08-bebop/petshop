import { readSecret, integerFromEnv } from '../../lib/config.js';
import { createDatabasePool } from '../../lib/database.js';
import { createHttpServer, listen } from '../../lib/http.js';
import { createLogger } from '../../lib/logger.js';
import { createFinanceHandler } from './app.js';
import { createFinanceRepository } from './repository.js';

const logger = createLogger('api-financeiro', process.env.LOG_LEVEL);
const pool = createDatabasePool(process.env);
const internalSecret = readSecret({ value: process.env.INTERNAL_SECRET, file: process.env.INTERNAL_SECRET_FILE, name: 'INTERNAL_SECRET' });
const handler = createFinanceHandler({ repository: createFinanceRepository(pool), internalSecret });
listen(createHttpServer({ serviceName: 'api-financeiro', logger, handler }), integerFromEnv(process.env.HTTP_PORT, 3000, 'HTTP_PORT'), logger);

