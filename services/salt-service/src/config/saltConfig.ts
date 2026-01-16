import { env } from './env.js';

export const saltConfig = {
  // Pear service integration
  pearServiceUrl: env.PEAR_SERVICE_URL,

  // Salt SDK configuration
  // Salt uses SIWER (Sign-In with Ethereum) authentication via mnemonic/private key
  // No API keys required - authentication is done via wallet signatures
  environment: (env.SALT_ENVIRONMENT || 'TESTNET') as 'TESTNET' | 'PRODUCTION',
  mnemonic: env.SALT_MNEMONIC || '',
  rpcUrl: env.SALT_RPC_URL || '',

  // Note: Default policy settings are defined in ../domain/policyTypes.ts
  // Import and use defaultPolicy from there when needed for consistency
};
