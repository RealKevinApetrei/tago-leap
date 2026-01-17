import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type { SaltPolicy, ValidateTradeResponse } from '@tago-leap/shared/types';

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Get the total notional traded today for a Salt account.
 * Sums up (stake_usd * leverage) for all completed trades today.
 */
export async function getTodayNotional(
  supabase: SupabaseAdminClient,
  saltAccountAddress: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data, error } = await supabase
    .from('trades')
    .select('stake_usd, pear_order_payload')
    .eq('account_ref', saltAccountAddress)
    .eq('status', 'completed')
    .gte('created_at', todayIso);

  if (error) {
    console.error('[PolicyEnforcer] Error fetching today trades:', error);
    throw new Error(`Failed to get today's notional: ${error.message}`);
  }

  let totalNotional = 0;
  for (const trade of data || []) {
    const stakeUsd = trade.stake_usd || 0;
    // Extract leverage from pear_order_payload
    const payload = trade.pear_order_payload as { leverage?: number } | null;
    const leverage = payload?.leverage || 1;
    totalNotional += stakeUsd * leverage;
  }

  return totalNotional;
}

/**
 * Validate a trade against the Salt account's policy.
 *
 * Checks:
 * 1. Leverage doesn't exceed maxLeverage
 * 2. Estimated notional + today's notional doesn't exceed maxDailyNotionalUsd
 * 3. Assets are in allowedPairs (if policy has restrictions)
 */
export function validateTradeAgainstPolicy(
  policy: SaltPolicy,
  computedPayload: NonNullable<ValidateTradeResponse['computedPayload']>,
  todayNotional: number
): PolicyValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Get policy values with defaults
  const maxLeverage = policy.max_leverage ?? 10;
  const maxDailyNotionalUsd = policy.max_daily_notional_usd ?? 1000000;

  // Check leverage
  if (computedPayload.leverage > maxLeverage) {
    violations.push(
      `Leverage ${computedPayload.leverage}x exceeds policy maximum of ${maxLeverage}x`
    );
  }

  // Check daily notional limit
  const projectedNotional = todayNotional + computedPayload.estimatedNotional;
  if (projectedNotional > maxDailyNotionalUsd) {
    violations.push(
      `Projected daily notional $${projectedNotional.toFixed(2)} exceeds policy limit of $${maxDailyNotionalUsd}`
    );
  }

  // Check near limit (80% threshold warning)
  const notionalThreshold = maxDailyNotionalUsd * 0.8;
  if (projectedNotional > notionalThreshold && violations.length === 0) {
    warnings.push(
      `Approaching daily notional limit (${((projectedNotional / maxDailyNotionalUsd) * 100).toFixed(0)}% used)`
    );
  }

  // Check allowed pairs if policy has restrictions
  const allowedPairs = policy.allowed_pairs as string[] | null;
  if (allowedPairs && allowedPairs.length > 0) {
    const allAssets = [
      ...computedPayload.longAssets.map(a => a.asset),
      ...computedPayload.shortAssets.map(a => a.asset),
    ];

    for (const asset of allAssets) {
      // Check if asset matches any allowed pair pattern
      // Pairs like "BTC-USD" should match asset "BTC"
      const isAllowed = allowedPairs.some(pair => {
        const baseAsset = pair.split('-')[0];
        return baseAsset === asset || pair === asset;
      });

      if (!isAllowed) {
        violations.push(`Asset ${asset} is not in allowed pairs: ${allowedPairs.join(', ')}`);
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
  };
}
