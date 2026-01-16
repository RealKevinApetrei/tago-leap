import { config } from './config';

// Generic API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// API fetch helper
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const result: ApiResponse<T> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'API request failed');
  }

  return result.data;
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

  // Auth endpoints
  getAuthMessage: (wallet: string) =>
    fetchApi<any>(`${config.pearServiceUrl}/auth/message?wallet=${wallet}`),

  verifyAuth: (data: { walletAddress: string; signature: string; message: any }) =>
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
};

// LI.FI Service API
export const lifiApi = {
  getOptions: () =>
    fetchApi<any[]>(`${config.lifiServiceUrl}/onboard/options`),

  getQuote: (data: {
    userWalletAddress: string;
    fromChainId: number;
    fromTokenAddress: string;
    amount: string;
    toTokenAddress: string;
  }) =>
    fetchApi<any>(`${config.lifiServiceUrl}/onboard/quote`, {
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
};

// Salt Service API
export const saltApi = {
  getStrategies: () =>
    fetchApi<any[]>(`${config.saltServiceUrl}/salt/strategies`),

  createAccount: (data: { userWalletAddress: string }) =>
    fetchApi<any>(`${config.saltServiceUrl}/salt/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAccount: (id: string) =>
    fetchApi<any>(`${config.saltServiceUrl}/salt/accounts/${id}`),

  setPolicy: (
    accountId: string,
    policy: {
      maxLeverage?: number;
      maxDailyNotionalUsd?: number;
      allowedPairs?: string[];
      maxDrawdownPct?: number;
    }
  ) =>
    fetchApi<any>(`${config.saltServiceUrl}/salt/accounts/${accountId}/policies`, {
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
    fetchApi<any>(`${config.saltServiceUrl}/salt/accounts/${accountId}/strategies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
