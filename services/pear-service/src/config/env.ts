import { validateEnv, pearEnvSchema } from '@tago-leap/shared/env';

export const env = validateEnv(pearEnvSchema);
