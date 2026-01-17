import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();
  // Railway injects PORT, fall back to config
  const port = parseInt(process.env.PORT || '') || env.LIFI_SERVICE_PORT;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`LI.FI service listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
