import { readSecret, integerFromEnv } from '../../lib/config.js';
import { createDatabasePool } from '../../lib/database.js';
import { createHttpServer, listen } from '../../lib/http.js';
import { createLogger } from '../../lib/logger.js';
import { createPetHandler } from './app.js';
import { createPetRepository } from './repository.js';

const logger = createLogger('api-pet', process.env.LOG_LEVEL);
const pool = createDatabasePool(process.env);
const internalSecret = readSecret({ value: process.env.INTERNAL_SECRET, file: process.env.INTERNAL_SECRET_FILE, name: 'INTERNAL_SECRET' });
const handler = createPetHandler({ repository: createPetRepository(pool), internalSecret });
listen(createHttpServer({ serviceName: 'api-pet', logger, handler }), integerFromEnv(process.env.HTTP_PORT, 3000, 'HTTP_PORT'), logger);
