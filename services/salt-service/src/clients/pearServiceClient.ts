import { saltConfig } from '../config/saltConfig.js';
import type {
  BetExecutionRequest,
  Trade,
  ApiResponse,
  ExecuteNarrativeTradeRequest,
  ValidateTradeResponse,
} from '@tago-leap/shared/types';

/**
 * Auth status response from pear-service
 */
export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: string;
}

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

/**
 * Execute a narrative-based trade via pear-service.
 * This endpoint resolves assets via the narrative definition and executes the trade.
 */
export async function executeNarrativeTrade(
  params: ExecuteNarrativeTradeRequest
): Promise<Trade> {
  const url = `${saltConfig.pearServiceUrl}/bets/execute-narrative`;

  console.log(`[PearServiceClient] Executing narrative trade:`, {
    url,
    narrativeId: params.narrativeId,
    direction: params.direction,
    stakeUsd: params.stakeUsd,
    accountRef: params.accountRef,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Pear service error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = (await response.json()) as ApiResponse<Trade>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error executing narrative trade:`, err);
    throw err;
  }
}

/**
 * Validate a narrative trade without executing.
 * Returns computed payload and any validation errors/warnings.
 */
export async function validateTrade(
  params: Omit<ExecuteNarrativeTradeRequest, 'userWalletAddress' | 'accountRef' | 'source'>
): Promise<ValidateTradeResponse> {
  const url = `${saltConfig.pearServiceUrl}/bets/validate`;

  console.log(`[PearServiceClient] Validating trade:`, params);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Pear service error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = (await response.json()) as ApiResponse<ValidateTradeResponse>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error validating trade:`, err);
    throw err;
  }
}

/**
 * Get trades for a Salt account by account reference (salt account address).
 */
export async function getTradesBySaltAccount(
  saltAccountAddress: string
): Promise<Trade[]> {
  const url = `${saltConfig.pearServiceUrl}/trades?accountRef=${encodeURIComponent(saltAccountAddress)}`;

  console.log(`[PearServiceClient] Getting trades for Salt account:`, saltAccountAddress);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pear service error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ApiResponse<Trade[]>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error getting Salt account trades:`, err);
    throw err;
  }
}

/**
 * Check if a user has valid Pear authentication.
 */
export async function checkUserAuth(
  walletAddress: string
): Promise<AuthStatus> {
  const url = `${saltConfig.pearServiceUrl}/auth/status?wallet=${encodeURIComponent(walletAddress)}`;

  console.log(`[PearServiceClient] Checking auth status for:`, walletAddress);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pear service error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ApiResponse<AuthStatus>;

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Unknown error from Pear service');
    }

    return result.data;
  } catch (err) {
    console.error(`[PearServiceClient] Error checking auth status:`, err);
    throw err;
  }
}
