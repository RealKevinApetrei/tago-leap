import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { accountsRoutes } from './accounts.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(accountsRoutes, { prefix: '/salt' });
}
