import type {
  Narrative,
  Direction,
  RiskProfile,
  TradeMode,
  PearOrderPayload,
  OpenPositionPayload,
} from '@tago-leap/shared/types';

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

export function buildOrderFromBet(params: BuildOrderParams): PearOrderPayload {
  const { narrative, direction, stakeUsd, riskProfile } = params;
  const leverage = getLeverageForRiskProfile(riskProfile);

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

export function buildOrderFromSaltRequest(params: BuildSaltOrderParams): OpenPositionPayload {
  const { narrative, direction, stakeUsd, riskProfile, mode } = params;
  const leverage = getLeverageForSaltRiskProfile(riskProfile);

  const isLong = direction === 'longNarrative';
  const longAssetSymbol = isLong ? narrative.longAsset : narrative.shortAsset;
  const shortAssetSymbol = isLong ? narrative.shortAsset : narrative.longAsset;

  const weight = 1.0;

  return {
    slippage: 0.01,
    executionType: 'MARKET',
    leverage,
    usdValue: stakeUsd,
    longAssets: [{ asset: longAssetSymbol, weight }],
    shortAssets: [{ asset: shortAssetSymbol, weight }],
  };
}

export function computeNotional(stakeUsd: number, leverage: number): number {
  return stakeUsd * leverage;
}
