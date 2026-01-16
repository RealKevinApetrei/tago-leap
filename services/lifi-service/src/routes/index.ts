import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { onboardingRoutes } from './onboarding.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(onboardingRoutes);
}
