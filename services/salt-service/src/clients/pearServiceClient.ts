import { saltConfig } from '../config/saltConfig.js';
import type { BetExecutionRequest, Trade, ApiResponse } from '@tago-leap/shared/types';

/**
 * Execute a bet via the Pear service.
 * This is a simple HTTP client to the pear-service.
 */
export async function executeBet(
  request: BetExecutionRequest
): Promise<Trade> {
  const url = `${saltConfig.pearServiceUrl}/bets/execute`;

  console.log(`[PearServiceClient] Executing bet:`, {
    url,
    request,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Pear service error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ApiResponse<Trade>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error executing bet:`, err);
    throw err;
  }
}

/**
 * Get narratives from the Pear service.
 */
export async function getNarratives(): Promise<unknown[]> {
  const url = `${saltConfig.pearServiceUrl}/narratives`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pear service error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ApiResponse<unknown[]>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error getting narratives:`, err);
    throw err;
  }
}
