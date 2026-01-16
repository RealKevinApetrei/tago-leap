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

// Pear Service API
export const pearApi = {
  getNarratives: () =>
    fetchApi<any[]>(`${config.pearServiceUrl}/narratives`),

  executeBet: (data: {
    userWalletAddress: string;
    narrativeId: string;
    direction: 'long' | 'short';
    stakeUsd: number;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    mode: 'paper' | 'live';
  }) =>
    fetchApi<any>(`${config.pearServiceUrl}/bets/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrades: (wallet: string) =>
    fetchApi<any[]>(`${config.pearServiceUrl}/trades?wallet=${wallet}`),
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
