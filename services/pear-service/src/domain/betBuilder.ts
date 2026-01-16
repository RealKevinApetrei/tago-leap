import type {
  Narrative,
  Direction,
  RiskProfile,
  TradeMode,
  PearOrderPayload,
} from '@tago-leap/shared/types';

interface BuildOrderParams {
  narrative: Narrative;
  direction: Direction;
  stakeUsd: number;
  riskProfile: RiskProfile;
  mode: TradeMode;
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
