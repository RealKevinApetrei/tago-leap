import { pearConfig } from '../config/pearConfig.js';
import type { PearOrderPayload } from '@tago-leap/shared/types';

export interface PearTradeResponse {
  orderId: string;
  status: 'submitted' | 'filled' | 'rejected';
  executedPrice?: number;
  executedQuantity?: number;
  timestamp: string;
}

/**
 * Execute a pair trade on Pear.
 * This is a stub implementation - replace with real API calls.
 */
export async function executePairTrade(
  payload: PearOrderPayload
): Promise<PearTradeResponse> {
  console.log(`[PearClient] Executing pair trade:`, {
    baseUrl: pearConfig.baseUrl,
    payload,
  });

  // Stub response - simulate successful trade execution
  return {
    orderId: `pear_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'filled',
    executedPrice: payload.stakeUsd * (1 + Math.random() * 0.01),
    executedQuantity: payload.stakeUsd,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute a basket trade on Pear.
 * This is a stub implementation - replace with real API calls.
 */
export async function executeBasketTrade(
  payloads: PearOrderPayload[]
): Promise<PearTradeResponse[]> {
  console.log(`[PearClient] Executing basket trade with ${payloads.length} legs`);

  // Execute each leg (stub)
  const results = await Promise.all(payloads.map(executePairTrade));
  return results;
}
