import { config } from './config';
import { TradeError, TradeErrorCode, ERROR_MESSAGES } from '@tago-leap/shared/types';

// Generic API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Custom error class that includes error code
export class ApiError extends Error {
  public code: string;
  public tradeError?: TradeError;

  constructor(message: string, code: string = 'UNKNOWN', tradeError?: TradeError) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.tradeError = tradeError;
  }
}

// Map backend error codes to TradeErrorCode
function mapToTradeError(code: string, message: string): TradeError {
  // Check if it's already a valid TradeErrorCode
  if (Object.values(TradeErrorCode).includes(code as TradeErrorCode)) {
    const tradeCode = code as TradeErrorCode;
    const template = ERROR_MESSAGES[tradeCode];
    return {
      code: tradeCode,
      message: template?.message || message,
      action: template?.action,
      actionUrl: template?.actionUrl,
      technicalMessage: message,
    };
  }

  // Map common error patterns to TradeErrorCode
  const lowerMessage = message.toLowerCase();

  if (code === 'POLICY_VIOLATION') {
    if (lowerMessage.includes('leverage')) {
      return createTradeError(TradeErrorCode.LEVERAGE_EXCEEDED, message);
    }
    if (lowerMessage.includes('notional') || lowerMessage.includes('daily')) {
      return createTradeError(TradeErrorCode.DAILY_NOTIONAL_EXCEEDED, message);
    }
    if (lowerMessage.includes('asset') || lowerMessage.includes('pair')) {
      return createTradeError(TradeErrorCode.ASSET_NOT_ALLOWED, message);
    }
    if (lowerMessage.includes('drawdown')) {
      return createTradeError(TradeErrorCode.DRAWDOWN_LIMIT_REACHED, message);
    }
  }

  if (lowerMessage.includes('insufficient') || lowerMessage.includes('balance')) {
    return createTradeError(TradeErrorCode.INSUFFICIENT_BALANCE, message);
  }
  if (lowerMessage.includes('margin')) {
    return createTradeError(TradeErrorCode.INSUFFICIENT_MARGIN, message);
  }
  if (lowerMessage.includes('authenticate') || lowerMessage.includes('sign in') || lowerMessage.includes('unauthorized')) {
    return createTradeError(TradeErrorCode.NOT_AUTHENTICATED, message);
  }
  if (lowerMessage.includes('agent wallet') && lowerMessage.includes('missing')) {
    return createTradeError(TradeErrorCode.AGENT_WALLET_MISSING, message);
  }
  if (lowerMessage.includes('agent wallet') && lowerMessage.includes('approved')) {
    return createTradeError(TradeErrorCode.AGENT_WALLET_NOT_APPROVED, message);
  }
  if (lowerMessage.includes('builder fee')) {
    return createTradeError(TradeErrorCode.BUILDER_FEE_NOT_APPROVED, message);
  }
  if (lowerMessage.includes('slippage')) {
    return createTradeError(TradeErrorCode.SLIPPAGE_EXCEEDED, message);
  }
  if (lowerMessage.includes('rejected')) {
    return createTradeError(TradeErrorCode.TRADE_REJECTED, message);
  }
  if (lowerMessage.includes('timeout')) {
    return createTradeError(TradeErrorCode.TIMEOUT, message);
  }
  if (lowerMessage.includes('hyperliquid')) {
    return createTradeError(TradeErrorCode.HYPERLIQUID_ERROR, message);
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return createTradeError(TradeErrorCode.NETWORK_ERROR, message);
  }

  // Default to generic execution error
  return createTradeError(TradeErrorCode.TRADE_REJECTED, message);
}

function createTradeError(code: TradeErrorCode, technicalMessage: string): TradeError {
  const template = ERROR_MESSAGES[code];
  return {
    code,
    message: template.message,
    action: template.action,
    actionUrl: template.actionUrl,
    technicalMessage,
  };
}

// API fetch helper with enhanced error handling
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const result: ApiResponse<T> = await response.json();

    if (!result.success || !result.data) {
      const errorCode = result.error?.code || 'UNKNOWN';
      const errorMessage = result.error?.message || 'API request failed';
      const tradeError = mapToTradeError(errorCode, errorMessage);
      throw new ApiError(errorMessage, errorCode, tradeError);
    }

    return result.data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const tradeError = createTradeError(TradeErrorCode.NETWORK_ERROR, error.message);
      throw new ApiError('Network connection failed', 'NETWORK_ERROR', tradeError);
    }

    // Wrap other errors
    const message = error instanceof Error ? error.message : String(error);
    throw new ApiError(message, 'UNKNOWN');
  }
}

// Pear API types
export interface NarrativeSuggestion {
  narrative: string;
  rationale: string;
  longAssets: Array<{ asset: string; weight: number; name: string; rationale?: string }>;
  shortAssets: Array<{ asset: string; weight: number; name: string; rationale?: string }>;
  confidence: number;
  suggestedLeverage: number;
  suggestedStakeUsd: number;
  warnings?: string[];
}

export interface MarketsResponse {
  markets: Array<{
    id: string;
    longAssets: Array<{ asset: string; name: string }>;
    shortAssets: Array<{ asset: string; name: string }>;
    volume24h: number;
    ratio: number;
    change24h: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

// Pear Service API
export const pearApi = {
  getMarkets: (params?: { pageSize?: number; searchText?: string }) =>
    fetchApi<MarketsResponse>(
      `${config.pearServiceUrl}/markets?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  suggestNarrative: (prompt: string) =>
    fetchApi<NarrativeSuggestion>(`${config.pearServiceUrl}/narratives/suggest`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  validateSuggestion: (suggestion: NarrativeSuggestion) =>
    fetchApi<{ valid: boolean; errors: string[] }>(`${config.pearServiceUrl}/narratives/validate`, {
      method: 'POST',
      body: JSON.stringify(suggestion),
    }),

  executeTrade: (data: {
    userWalletAddress: string;
    longAssets: Array<{ asset: string; weight: number }>;
    shortAssets: Array<{ asset: string; weight: number }>;
    stakeUsd: number;
    leverage: number;
    slippage?: number;
  }) =>
    fetchApi<any>(`${config.pearServiceUrl}/bets/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPositions: (wallet: string) =>
    fetchApi<any[]>(`${config.pearServiceUrl}/positions?wallet=${wallet}`),

  closePosition: (positionId: string, walletAddress: string) =>
    fetchApi<any>(`${config.pearServiceUrl}/positions/${positionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  getTrades: (wallet: string) =>
    fetchApi<any[]>(`${config.pearServiceUrl}/trades?wallet=${wallet}`),

  getTradesByAccount: (accountRef: string) =>
    fetchApi<any[]>(`${config.pearServiceUrl}/trades?accountRef=${encodeURIComponent(accountRef)}`),

  // Auth endpoints
  getAuthMessage: (wallet: string) =>
    fetchApi<{
      domain: any;
      types: any;
      primaryType: string;
      message: any;
      timestamp: number;
    }>(`${config.pearServiceUrl}/auth/message?wallet=${wallet}`),

  verifyAuth: (data: { walletAddress: string; signature: string; timestamp: number }) =>
    fetchApi<{ authenticated: boolean }>(`${config.pearServiceUrl}/auth/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAuthStatus: (wallet: string) =>
    fetchApi<{ authenticated: boolean; expiresAt?: string }>(
      `${config.pearServiceUrl}/auth/status?wallet=${wallet}`
    ),

  logout: (walletAddress: string) =>
    fetchApi<{ loggedOut: boolean }>(`${config.pearServiceUrl}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  // Agent Wallet endpoints
  getAgentWallet: (wallet: string) =>
    fetchApi<{ exists: boolean; agentWalletAddress: string | null }>(
      `${config.pearServiceUrl}/auth/agent-wallet?wallet=${wallet}`
    ),

  createAgentWallet: (walletAddress: string) =>
    fetchApi<{ agentWalletAddress: string; message: string }>(
      `${config.pearServiceUrl}/auth/agent-wallet`,
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    ),
};

// LI.FI Service API
export const lifiApi = {
  getOptions: () =>
    fetchApi<any[]>(`${config.lifiServiceUrl}/onboard/options`),

  getSaltWallet: (address: string) =>
    fetchApi<{
      userWalletAddress: string;
      saltWalletAddress: string;
      exists: boolean;
    }>(`${config.lifiServiceUrl}/onboard/salt-wallet/${address}`),

  getQuote: (data: {
    userWalletAddress: string;
    fromChainId: number;
    fromTokenAddress: string;
    amount: string;
    toTokenAddress: string;
    toChainId?: number;
    depositToSaltWallet?: boolean;
  }) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/quote`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  selectRoute: (data: { flowId: string; routeId: string }) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/select-route`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  trackOnboarding: (data: { flowId: string; txHashes: string[] }) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/track`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deposit: (data: { flowId: string }) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/deposit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFlow: (flowId: string) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/flow/${flowId}`),
};

// Salt Service API
// Note: saltServiceUrl is now '/api/salt', so paths no longer need '/salt/' prefix
export const saltApi = {
  getStrategies: () =>
    fetchApi<any[]>(`${config.saltServiceUrl}/strategies`),

  createAccount: (data: { userWalletAddress: string }) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAccount: (id: string) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${id}`),

  setPolicy: (
    accountId: string,
    policy: {
      maxLeverage?: number;
      maxDailyNotionalUsd?: number;
      allowedPairs?: string[];
      maxDrawdownPct?: number;
    }
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${accountId}/policies`, {
      method: 'POST',
      body: JSON.stringify({ policy }),
    }),

  addStrategy: (
    accountId: string,
    data: {
      strategyId: string;
      params?: Record<string, unknown>;
      active: boolean;
    }
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${accountId}/strategies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executeTrade: (
    accountId: string,
    data: {
      narrativeId: string;
      direction: 'longNarrative' | 'shortNarrative';
      stakeUsd: number;
      riskProfile: 'conservative' | 'standard' | 'degen';
      mode: 'pair' | 'basket';
    }
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${accountId}/trade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAccountTrades: (accountId: string) =>
    fetchApi<any[]>(`${config.saltServiceUrl}/accounts/${accountId}/trades`),

  getStrategyRuns: (accountId: string, limit?: number) =>
    fetchApi<any[]>(
      `${config.saltServiceUrl}/accounts/${accountId}/strategy-runs${limit ? `?limit=${limit}` : ''}`
    ),

  updateStrategy: (
    accountId: string,
    strategyId: string,
    active: boolean
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${accountId}/strategies`, {
      method: 'POST',
      body: JSON.stringify({ strategyId, active }),
    }),

  /**
   * Execute a direct pair trade with Salt policy validation.
   * Routes through Salt service which:
   * 1. Validates user is authenticated with Pear
   * 2. Checks trade against account policy (leverage, notional, allowed pairs)
   * 3. Executes via Pear service with source='salt'
   */
  executePairTrade: (
    accountId: string,
    data: {
      longAssets: Array<{ asset: string; weight: number }>;
      shortAssets: Array<{ asset: string; weight: number }>;
      stakeUsd: number;
      leverage: number;
      slippage?: number;
    }
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/accounts/${accountId}/pair-trade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
