export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  defaultParams: Record<string, unknown>;
}

export const strategies: StrategyDefinition[] = [
  {
    id: 'momentum',
    name: 'Momentum Trading',
    description: 'Trade based on price momentum signals',
    defaultParams: {
      lookbackPeriod: 14,
      threshold: 0.02,
    },
  },
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Trade reversals when price deviates from mean',
    defaultParams: {
      lookbackPeriod: 20,
      stdDevMultiplier: 2,
    },
  },
  {
    id: 'narrative-follow',
    name: 'Narrative Follow',
    description: 'Follow trending market narratives',
    defaultParams: {
      riskProfile: 'standard',
    },
  },
];

export function getAllStrategies(): StrategyDefinition[] {
  return strategies;
}

export function getStrategyById(id: string): StrategyDefinition | undefined {
  return strategies.find(s => s.id === id);
}
