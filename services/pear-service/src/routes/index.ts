import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { tradesRoutes } from './trades.js';
import { authRoutes } from './auth.js';
import { narrativesRoutes } from './narratives.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(tradesRoutes);
  await app.register(narrativesRoutes);
}
