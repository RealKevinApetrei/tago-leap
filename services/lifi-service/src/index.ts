import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: env.LIFI_SERVICE_PORT, host: '0.0.0.0' });
    app.log.info(`LI.FI service listening on port ${env.LIFI_SERVICE_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
