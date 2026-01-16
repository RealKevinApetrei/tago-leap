import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'lifi-service',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/health/ready', async () => {
    // Check Supabase connection
    try {
      const { error } = await app.supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { status: 'ready' };
    } catch (err) {
      return app.httpErrors.serviceUnavailable('Database not ready');
    }
  });
}
