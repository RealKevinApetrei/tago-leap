import { hyperliquidConfig } from '../config/hyperliquidConfig.js';

interface DepositRequest {
  userWallet: string;
  tokenAddress: string;
  amount: string;
}

interface DepositResponse {
  depositId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime: string;
}

/**
 * Create a deposit request on Hyperliquid.
 * This is a stub implementation.
 */
export async function createDepositRequest(
  params: DepositRequest
): Promise<DepositResponse> {
  console.log(`[HyperliquidClient] Creating deposit request:`, {
    apiBaseUrl: hyperliquidConfig.apiBaseUrl,
    chainId: hyperliquidConfig.hyperEvmChainId,
    ...params,
  });

  // Stub response - simulate deposit creation
  return {
    depositId: `hl_dep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'pending',
    estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins
  };
}

/**
 * Check deposit status on Hyperliquid.
 * This is a stub implementation.
 */
export async function getDepositStatus(
  depositId: string
): Promise<DepositResponse> {
  console.log(`[HyperliquidClient] Checking deposit status: ${depositId}`);

  // Stub response - return completed status
  return {
    depositId,
    status: 'completed',
    estimatedCompletionTime: new Date().toISOString(),
  };
}
