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
 * Conservative settings:
 * - 2x leverage (low risk)
 * - $10k daily limit (moderate position sizing)
 * - Major pairs only (BTC, ETH, SOL)
 * - 10% max drawdown (capital preservation)
 */
export const defaultPolicy: SaltPolicy = {
  maxLeverage: 2,
  maxDailyNotionalUsd: 10000,
  allowedPairs: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
  maxDrawdownPct: 10,
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
