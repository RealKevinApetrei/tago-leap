// Import database types
import type { Database, Tables, TablesInsert, TablesUpdate, Json } from './database.js';

// Re-export database types
export type { Database, Tables, TablesInsert, TablesUpdate, Json };

// Re-export Pear Protocol types
export * from './pear.js';

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

/** Token info with human-readable details */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  logoUri?: string;
  priceUsd?: string;
}

/** Chain info with human-readable details */
export interface ChainInfo {
  chainId: number;
  name: string;
  logoUri?: string;
  explorerUrl?: string;
}

/** Fee breakdown for transparency */
export interface RouteFees {
  /** Gas cost in native token */
  gasCostNative: string;
  /** Gas cost in USD */
  gasCostUsd: string;
  /** Protocol/bridge fees in USD */
  protocolFeeUsd: string;
  /** Total fees in USD */
  totalFeeUsd: string;
}

/** Detailed route with full transparency */
export interface LifiRoute {
  /** Unique route ID for tracking */
  routeId: string;

  /** Source chain info */
  fromChainId: number;
  fromChain: ChainInfo;

  /** Destination chain info */
  toChainId: number;
  toChain: ChainInfo;

  /** Source token */
  fromToken: string;
  fromTokenInfo: TokenInfo;

  /** Destination token */
  toToken: string;
  toTokenInfo: TokenInfo;

  /** Input amount (raw, smallest unit) */
  fromAmount: string;
  /** Input amount (human-readable) */
  fromAmountFormatted: string;
  /** Input amount in USD */
  fromAmountUsd: string;

  /** Output amount (raw, smallest unit) */
  toAmount: string;
  /** Output amount (human-readable) */
  toAmountFormatted: string;
  /** Output amount in USD */
  toAmountUsd: string;

  /** Minimum output amount after slippage */
  toAmountMin: string;

  /** Exchange rate (1 fromToken = X toToken) */
  exchangeRate: string;

  /** Slippage percentage (e.g., "0.5" for 0.5%) */
  slippage: string;

  /** Total estimated execution time in seconds */
  estimatedDurationSeconds: number;
  /** Human-readable ETA (e.g., "~5 minutes") */
  estimatedDurationFormatted: string;

  /** Fee breakdown */
  fees: RouteFees;

  /** Legacy gas field for backwards compatibility */
  estimatedGas: string;

  /** Detailed steps in execution order */
  steps: LifiRouteStep[];

  /** Route tags (e.g., "FASTEST", "CHEAPEST") */
  tags?: string[];
}

/** Detailed step in a route */
export interface LifiRouteStep {
  /** Step index (1-based for display) */
  stepIndex: number;

  /** Step type */
  type: 'swap' | 'bridge' | 'cross';

  /** Human-readable action (e.g., "Swap ETH to USDC on Uniswap") */
  action: string;

  /** Tool/protocol used (e.g., "uniswap", "stargate", "hop") */
  tool: string;
  /** Tool display name */
  toolName: string;
  /** Tool logo URI */
  toolLogoUri?: string;

  /** Source chain */
  fromChainId: number;
  fromChainName: string;

  /** Destination chain */
  toChainId: number;
  toChainName: string;

  /** Source token */
  fromToken: string;
  fromTokenSymbol: string;

  /** Destination token */
  toToken: string;
  toTokenSymbol: string;

  /** Input amount for this step */
  fromAmount: string;
  fromAmountFormatted: string;

  /** Output amount for this step */
  toAmount: string;
  toAmountFormatted: string;

  /** Estimated time for this step in seconds */
  estimatedDurationSeconds: number;

  /** Fees for this step */
  fees: {
    gasCostUsd: string;
    protocolFeeUsd: string;
  };

  /** Execution status for tracking */
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Transaction hash once submitted */
  txHash?: string;

  /** Explorer link for this step's transaction */
  explorerLink?: string;
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
