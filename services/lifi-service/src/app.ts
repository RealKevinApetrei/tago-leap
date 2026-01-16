import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { supabasePlugin } from './plugins/supabase.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
    },
  });

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(supabasePlugin);

  // Register routes
  await registerRoutes(app);

  return app;
}
