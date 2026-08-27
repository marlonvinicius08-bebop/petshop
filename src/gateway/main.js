import { readSecret, integerFromEnv } from '../lib/config.js';
import { createHttpServer, listen } from '../lib/http.js';
import { createLogger } from '../lib/logger.js';
import { createGatewayHandler, createRateLimiter } from './app.js';

const logger = createLogger('api-gateway', process.env.LOG_LEVEL);
const port = integerFromEnv(process.env.HTTP_PORT, 3000, 'HTTP_PORT');
const jwtSecret = readSecret({
  value: process.env.JWT_SECRET,
  file: process.env.JWT_SECRET_FILE,
  name: 'JWT_SECRET',
});
const internalSecret = readSecret({
  value: process.env.INTERNAL_SECRET,
  file: process.env.INTERNAL_SECRET_FILE,
  name: 'INTERNAL_SECRET',
});
const rateLimiter = createRateLimiter({
  maximum: integerFromEnv(process.env.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
  windowMs: integerFromEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
});

const handler = createGatewayHandler({
  serviceUrls: {
    pet: process.env.PET_API_URL ?? 'http://api-pet:3000',
    agenda: process.env.AGENDA_API_URL ?? 'http://api-agenda:3000',
    financeiro: process.env.FINANCEIRO_API_URL ?? 'http://api-financeiro:3000',
  },
  jwtSecret,
  internalSecret,
  rateLimiter,
});

listen(createHttpServer({ serviceName: 'api-gateway', logger, handler }), port, logger);

