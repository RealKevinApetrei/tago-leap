import { validateEnv, saltEnvSchema } from '@tago-leap/shared/env';

export const env = validateEnv(saltEnvSchema);
