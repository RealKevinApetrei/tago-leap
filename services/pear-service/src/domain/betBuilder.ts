import type {
  Narrative,
  Direction,
  RiskProfile,
  TradeMode,
  PearOrderPayload,
  OpenPositionPayload,
} from '@tago-leap/shared/types';

// Salt-specific types
export type SaltDirection = 'longNarrative' | 'shortNarrative';
export type SaltRiskProfile = 'conservative' | 'standard' | 'degen';
export type SaltMode = 'pair' | 'basket';

interface BuildOrderParams {
  narrative: Narrative;
  direction: Direction;
  stakeUsd: number;
  riskProfile: RiskProfile;
  mode: TradeMode;
}

interface BuildSaltOrderParams {
  narrative: Narrative;
  direction: SaltDirection;
  stakeUsd: number;
  riskProfile: SaltRiskProfile;
  mode: SaltMode;
}

/**
 * Map risk profile to leverage multiplier.
 */
function getLeverageForRiskProfile(riskProfile: RiskProfile): number {
  switch (riskProfile) {
    case 'conservative':
      return 1;
    case 'moderate':
      return 2;
    case 'aggressive':
      return 5;
    default:
      return 1;
  }
}

/**
 * Map Salt risk profile to leverage multiplier.
 */
function getLeverageForSaltRiskProfile(riskProfile: SaltRiskProfile): number {
  switch (riskProfile) {
    case 'conservative':
      return 1;
    case 'standard':
      return 2;
    case 'degen':
      return 5;
    default:
      return 1;
  }
}

/**
 * Build a Pear order payload from a bet specification.
 *
 * For a "long" direction, we go long the narrative's longAsset and short the shortAsset.
 * For a "short" direction, we invert the positions.
 */
export function buildOrderFromBet(params: BuildOrderParams): PearOrderPayload {
  const { narrative, direction, stakeUsd, riskProfile } = params;
  const leverage = getLeverageForRiskProfile(riskProfile);

  // Determine which asset to long/short based on direction
  const longAsset = direction === 'long' ? narrative.longAsset : narrative.shortAsset;
  const shortAsset = direction === 'long' ? narrative.shortAsset : narrative.longAsset;

  return {
    narrativeId: narrative.id,
    direction,
    stakeUsd,
    leverage,
    longAsset,
    shortAsset,
  };
}

/**
 * Build a Pear-compatible order payload from Salt narrative trade request.
 *
 * For "longNarrative", we go long the narrative's longAsset and short the shortAsset.
 * For "shortNarrative", we invert the positions.
 *
 * Mode 'pair' creates a simple 1:1 pair trade.
 * Mode 'basket' could support multi-asset trades in the future.
 */
export function buildOrderFromSaltRequest(params: BuildSaltOrderParams): OpenPositionPayload {
  const { narrative, direction, stakeUsd, riskProfile, mode } = params;
  const leverage = getLeverageForSaltRiskProfile(riskProfile);

  // Determine which asset to long/short based on direction
  const isLong = direction === 'longNarrative';
  const longAssetSymbol = isLong ? narrative.longAsset : narrative.shortAsset;
  const shortAssetSymbol = isLong ? narrative.shortAsset : narrative.longAsset;

  // For 'pair' mode, use equal weights (1:1)
  // For 'basket' mode, could support multiple assets with different weights in the future
  const weight = 1.0;

  return {
    slippage: 0.01, // 1% default slippage
    executionType: 'MARKET', // Pear API expects uppercase
    leverage,
    usdValue: stakeUsd,
    longAssets: [{ asset: longAssetSymbol, weight }],
    shortAssets: [{ asset: shortAssetSymbol, weight }],
  };
}

/**
 * Get the computed notional value for a trade.
 */
export function computeNotional(stakeUsd: number, leverage: number): number {
  return stakeUsd * leverage;
}
