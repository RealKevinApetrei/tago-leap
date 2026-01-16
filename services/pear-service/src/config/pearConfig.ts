import { env } from './env.js';

export const pearConfig = {
  apiBaseUrl: env.PEAR_API_BASE_URL,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
};
