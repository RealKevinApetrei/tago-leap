/**
 * Available strategy identifiers.
 */
export type StrategyId = 'meanReversionAiVsEth' | 'solEcoVsBtc' | 'defiMomentum';

/**
 * Strategy parameter configuration.
 */
export interface StrategyParams {
  entryThreshold?: number;
  exitThreshold?: number;
  positionSizeUsd?: number;
  maxPositions?: number;
  rebalanceIntervalMinutes?: number;
}

/**
 * Strategy definition with metadata.
 */
export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  description: string;
  defaultParams: StrategyParams;
  narrativeId: string;
}

/**
 * Available strategies.
 */
export const strategies: StrategyDefinition[] = [
  {
    id: 'meanReversionAiVsEth',
    name: 'Mean Reversion: AI vs ETH',
    description: 'Trade AI tokens vs ETH when price deviates from moving average',
    narrativeId: 'ai-vs-eth',
    defaultParams: {
      entryThreshold: 0.05,
      exitThreshold: 0.02,
      positionSizeUsd: 1000,
      maxPositions: 3,
      rebalanceIntervalMinutes: 60,
    },
  },
  {
    id: 'solEcoVsBtc',
    name: 'SOL Ecosystem vs BTC',
    description: 'Momentum strategy for Solana ecosystem against Bitcoin',
    narrativeId: 'sol-eco-vs-btc',
    defaultParams: {
      entryThreshold: 0.03,
      exitThreshold: 0.01,
      positionSizeUsd: 500,
      maxPositions: 5,
      rebalanceIntervalMinutes: 30,
    },
  },
  {
    id: 'defiMomentum',
    name: 'DeFi Momentum',
    description: 'Follow momentum in DeFi blue chips vs ETH',
    narrativeId: 'defi-vs-eth',
    defaultParams: {
      entryThreshold: 0.04,
      exitThreshold: 0.015,
      positionSizeUsd: 750,
      maxPositions: 4,
      rebalanceIntervalMinutes: 45,
    },
  },
];

/**
 * Get strategy definition by ID.
 */
export function getStrategyById(id: StrategyId): StrategyDefinition | undefined {
  return strategies.find((s) => s.id === id);
}

/**
 * Get all available strategies.
 */
export function getAllStrategies(): StrategyDefinition[] {
  return strategies;
}
