export interface SaltPolicyInput {
  maxLeverage: number;
  maxDailyNotionalUsd: number;
  allowedPairs: string[];
  maxDrawdownPct: number;
}

export const defaultPolicy: SaltPolicyInput = {
  maxLeverage: 5,
  maxDailyNotionalUsd: 50000,
  allowedPairs: [
    'BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP',
    'WIF', 'PEPE', 'SUI', 'APT', 'INJ', 'TIA', 'SEI', 'JUP',
    'RENDER', 'TAO', 'FET', 'DOT', 'ATOM', 'NEAR', 'FTM', 'MATIC',
    'LTC', 'BCH', 'XRP', 'ADA', 'HBAR', 'UNI', 'AAVE', 'MKR',
  ],
  maxDrawdownPct: 15,
};

export function validatePolicy(policy: Partial<SaltPolicyInput>): string[] {
  const errors: string[] = [];

  if (policy.maxLeverage !== undefined) {
    if (policy.maxLeverage < 1 || policy.maxLeverage > 10) {
      errors.push('maxLeverage must be between 1 and 10');
    }
  }

  if (policy.maxDailyNotionalUsd !== undefined) {
    if (policy.maxDailyNotionalUsd < 100 || policy.maxDailyNotionalUsd > 1000000) {
      errors.push('maxDailyNotionalUsd must be between 100 and 1,000,000');
    }
  }

  if (policy.maxDrawdownPct !== undefined) {
    if (policy.maxDrawdownPct < 1 || policy.maxDrawdownPct > 50) {
      errors.push('maxDrawdownPct must be between 1 and 50');
    }
  }

  return errors;
}
