import { env } from './env.js';

export const pearConfig = {
  baseUrl: env.PEAR_BASE_URL || 'https://api.pear.example.com',
  clientId: env.PEAR_CLIENT_ID || '',
  apiKey: env.PEAR_API_KEY || '',
};
