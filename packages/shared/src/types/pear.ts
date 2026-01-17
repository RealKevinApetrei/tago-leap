// Pear Protocol API Types

// Asset types from Pear API
export interface PairAssetDto {
  asset: string;
  weight?: number;
}

// Market/pair group item from Pear API
export interface ActiveAssetGroupItem {
  longAssets: PairAssetDto[];
  shortAssets: PairAssetDto[];
  openInterest: string;
  volume: string;
  ratio?: string;
  prevRatio?: string;
  change24h?: string;
  weightedRatio?: string;
  weightedPrevRatio?: string;
  weightedChange24h?: string;
  netFunding: string;
}

// Raw response from Pear API /market endpoint
export interface ActiveAssetsResponse {
  active: ActiveAssetGroupItem[];
  topGainers: ActiveAssetGroupItem[];
  topLosers: ActiveAssetGroupItem[];
  highlighted: ActiveAssetGroupItem[];
  watchlist: ActiveAssetGroupItem[];
}

// Our internal market type (flattened for easier use)
export interface PearMarket {
  longAssets: PairAssetDto[];
  shortAssets: PairAssetDto[];
  volume?: string;
  ratio?: string;
  change24h?: string;
  openInterest?: string;
}

// Wrapper response we return from our API
export interface MarketsResponse {
  markets: PearMarket[];
  raw?: ActiveAssetsResponse;
}

export interface GetMarketsParams {
  pageSize?: number;
  page?: number;
  active?: boolean;
}

// Position types
export interface PearPositionAsset {
  asset: string;
  weight: number;
  size: number;
  entryPrice: number;
  currentPrice: number;
}

export interface PearPosition {
  id: string;
  longAssets: PearPositionAsset[];
  shortAssets: PearPositionAsset[];
  leverage: number;
  usdValue: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed' | 'liquidated';
  createdAt: string;
  updatedAt: string;
}

// Order types - Pear API uses uppercase execution types
export interface OpenPositionPayload {
  slippage: number;
  executionType: 'MARKET' | 'LIMIT' | 'TWAP' | 'LADDER';
  leverage: number;
  usdValue: number;
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
}

export interface OrderFill {
  coin: string;
  px: string;
  sz: string;
  dir: string;
  fee: string;
  oid: number;
  tid: number;
  hash: string;
  side: string;
  time: number;
  cloid: string;
  crossed: boolean;
  feeToken: string;
  closedPnl: string;
  builderFee: string;
  startPosition: string;
}

export interface OrderResponse {
  orderId: string;
  fills?: OrderFill[];
  status?: 'pending' | 'filled' | 'rejected' | 'cancelled';
  error?: string;
  timestamp?: string;
}

// Authentication types
export interface EIP712Message {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
  timestamp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthenticatePayload {
  walletAddress: string;
  signature: string;
  timestamp: number;
}

// AI Narrative Suggestion types
export interface NarrativeSuggestionAsset {
  asset: string;
  weight: number;
  name: string;
  rationale?: string;
}

export interface NarrativeSuggestion {
  narrative: string;
  rationale: string;
  longAssets: NarrativeSuggestionAsset[];
  shortAssets: NarrativeSuggestionAsset[];
  confidence: number;
  suggestedLeverage: number;
  suggestedStakeUsd: number;
  warnings?: string[];
}

export interface SuggestNarrativeRequest {
  prompt: string;
}

// Trade source type
export type TradeSource = 'user' | 'salt';

// Direct-asset execution request (for AI suggestions and manual trades)
export interface ExecuteTradeRequest {
  userWalletAddress: string;
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
  stakeUsd: number;
  leverage: number;
  slippage?: number;
  accountRef?: string;      // Salt account address, if robo-managed
  source?: TradeSource;     // Defaults to 'user'
}

// Narrative-based execution request (for Salt)
export interface ExecuteNarrativeTradeRequest {
  userWalletAddress: string;
  narrativeId: string;
  direction: 'longNarrative' | 'shortNarrative';
  stakeUsd: number;
  riskProfile: 'conservative' | 'standard' | 'degen';
  mode: 'pair' | 'basket';
  accountRef?: string;      // Salt account address
  source?: TradeSource;     // Defaults to 'user'
}

// Validation response for dry-run checks
export interface ValidateTradeResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  computedPayload?: {
    longAssets: Array<{ asset: string; weight: number }>;
    shortAssets: Array<{ asset: string; weight: number }>;
    leverage: number;
    estimatedNotional: number;
  };
}

// Trade filters for querying
export interface TradeFilters {
  walletAddress?: string;
  accountRef?: string;
  source?: TradeSource;
  status?: string;
}
