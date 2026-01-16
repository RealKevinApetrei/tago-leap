import { validateEnv, lifiEnvSchema } from '@tago-leap/shared/env';

export const env = validateEnv(lifiEnvSchema);
