import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { tradesRoutes } from './trades.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(tradesRoutes);
}
