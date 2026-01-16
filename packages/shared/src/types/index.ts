// Import database types
import type { Database, Tables, TablesInsert, TablesUpdate, Json } from './database.js';

// Re-export database types
export type { Database, Tables, TablesInsert, TablesUpdate, Json };

// Convenience type aliases for table rows
export type User = Tables<'users'>;
export type Trade = Tables<'trades'>;
export type OnboardingFlow = Tables<'onboarding_flows'>;
export type SaltAccount = Tables<'salt_accounts'>;
export type SaltPolicy = Tables<'salt_policies'>;
export type SaltStrategy = Tables<'salt_strategies'>;
export type StrategyRun = Tables<'strategy_runs'>;

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Narrative types for Pear service
export interface Narrative {
  id: string;
  name: string;
  description: string;
  longAsset: string;
  shortAsset: string;
}

// Bet execution types
export type Direction = 'long' | 'short';
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type TradeMode = 'paper' | 'live';

export interface BetExecutionRequest {
  userWalletAddress: string;
  narrativeId: string;
  direction: Direction;
  stakeUsd: number;
  riskProfile: RiskProfile;
  mode: TradeMode;
  accountRef?: string;
}

export interface PearOrderPayload {
  narrativeId: string;
  direction: Direction;
  stakeUsd: number;
  leverage: number;
  longAsset: string;
  shortAsset: string;
}

// Onboarding types for LI.FI service
export interface OnboardingQuoteRequest {
  userWalletAddress: string;
  fromChainId: number;
  fromTokenAddress: string;
  amount: string;
  toTokenAddress: string;
}

export interface LifiRoute {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  steps: LifiRouteStep[];
}

export interface LifiRouteStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
}

export interface SupportedOption {
  chainId: number;
  chainName: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

// Salt service types
export interface SaltPolicyInput {
  maxLeverage?: number;
  maxDailyNotionalUsd?: number;
  allowedPairs?: string[];
  maxDrawdownPct?: number;
}

export type StrategyId = 'meanReversionAiVsEth' | 'solEcoVsBtc' | 'defiMomentum';

export interface StrategyParams {
  entryThreshold?: number;
  exitThreshold?: number;
  positionSizeUsd?: number;
  maxPositions?: number;
}

export interface CreateStrategyRequest {
  strategyId: StrategyId;
  params: StrategyParams;
  active: boolean;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}
