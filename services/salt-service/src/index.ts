import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: env.SALT_SERVICE_PORT, host: '0.0.0.0' });
    app.log.info(`Salt service listening on port ${env.SALT_SERVICE_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
