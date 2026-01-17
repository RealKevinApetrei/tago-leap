/**
 * Salt policy configuration for risk management.
 */
export interface SaltPolicy {
  maxLeverage: number;
  maxDailyNotionalUsd: number;
  allowedPairs: string[];
  maxDrawdownPct: number;
}

/**
 * Default policy for new accounts.
 *
 * This is the single source of truth for default policy values.
 * All other parts of the codebase should import this constant
 * rather than defining their own defaults.
 *
 * Moderate settings for hackathon demo:
 * - 5x leverage (moderate risk)
 * - $50k daily limit (reasonable for demo)
 * - Popular pairs on Hyperliquid
 * - 15% max drawdown
 */
export const defaultPolicy: SaltPolicy = {
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

/**
 * Validate a policy against constraints.
 */
export function validatePolicy(policy: Partial<SaltPolicy>): string[] {
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
