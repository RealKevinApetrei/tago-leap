import { env } from './env.js';

export const hyperliquidConfig = {
  apiBaseUrl: env.HYPERLIQUID_API_BASE_URL,
  hyperEvmChainId: env.HYPEREVM_CHAIN_ID,
};
