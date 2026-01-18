export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'standard' | 'degen';
  defaultParams: Record<string, unknown>;
}

export const strategies: StrategyDefinition[] = [
  {
    id: 'take-profit',
    name: 'Take Profit',
    description: 'Auto-close positions at fixed profit target',
    riskLevel: 'conservative',
    defaultParams: {
      takeProfitPct: 5,      // Close at 5% profit
      stopLossPct: 10,       // Optional stop loss at -10%
    },
  },
  {
    id: 'trailing-stop',
    name: 'Trailing Stop',
    description: 'Dynamic stop that follows price, locks in gains',
    riskLevel: 'conservative',
    defaultParams: {
      trailPct: 3,           // Trail 3% below peak
      activationPct: 2,      // Activate after 2% profit
    },
  },
  {
    id: 'vwap-exit',
    name: 'VWAP Exit',
    description: 'Exit when price crosses VWAP (mean reversion)',
    riskLevel: 'standard',
    defaultParams: {
      exitOnCross: 'below',  // Exit longs when price crosses below VWAP
      minProfitPct: 1,       // Minimum profit before VWAP exit triggers
    },
  },
  {
    id: 'adx-momentum',
    name: 'ADX Momentum',
    description: 'Exit when trend strength weakens (ADX drops)',
    riskLevel: 'standard',
    defaultParams: {
      adxThreshold: 25,      // Exit when ADX falls below 25
      minProfitPct: 2,       // Minimum profit before ADX exit triggers
    },
  },
];

export function getAllStrategies(): StrategyDefinition[] {
  return strategies;
}

export function getStrategyById(id: string): StrategyDefinition | undefined {
  return strategies.find(s => s.id === id);
}
