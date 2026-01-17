'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  HyperliquidBalance,
  PolicyValidationResult,
  TradeValidationParams,
} from '@tago-leap/shared/types';
import { saltApi } from '@/lib/api';

interface PolicyLimits {
  maxLeverage: number;
  maxDailyNotionalUsd: number;
  allowedPairs: string[];
  maxDrawdownPct: number;
}

interface UsePolicyValidationReturn {
  validation: PolicyValidationResult | null;
  isValidating: boolean;
  error: string | null;
  validate: (params: TradeValidationParams) => Promise<PolicyValidationResult>;
  policy: PolicyLimits | null;
  todayNotional: number;
  remainingNotional: number;
}

const DEFAULT_POLICY: PolicyLimits = {
  maxLeverage: 5,
  maxDailyNotionalUsd: 10000,
  allowedPairs: ['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP', 'WIF', 'PEPE'],
  maxDrawdownPct: 10,
};

/**
 * Hook to validate trades against Salt account policy
 *
 * Performs client-side validation using the account's policy settings.
 * Checks leverage limits, daily notional caps, and asset allowlists.
 */
export function usePolicyValidation(accountId: string | null): UsePolicyValidationReturn {
  const [validation, setValidation] = useState<PolicyValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<PolicyLimits | null>(null);
  const [todayNotional, setTodayNotional] = useState(0);

  // Fetch account policy and today's notional on mount
  useEffect(() => {
    if (!accountId) {
      setPolicy(DEFAULT_POLICY);
      setTodayNotional(0);
      return;
    }

    const fetchAccountData = async () => {
      try {
        // Get account details with policy
        const accountData = await saltApi.getAccount(accountId);

        if (accountData.policy) {
          setPolicy({
            maxLeverage: accountData.policy.max_leverage ?? DEFAULT_POLICY.maxLeverage,
            maxDailyNotionalUsd: accountData.policy.max_daily_notional_usd ?? DEFAULT_POLICY.maxDailyNotionalUsd,
            allowedPairs: (accountData.policy.allowed_pairs as string[]) ?? DEFAULT_POLICY.allowedPairs,
            maxDrawdownPct: accountData.policy.max_drawdown_pct ?? DEFAULT_POLICY.maxDrawdownPct,
          });
        } else {
          setPolicy(DEFAULT_POLICY);
        }

        // Calculate today's notional from trades
        const trades = await saltApi.getAccountTrades(accountId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysTrades = trades.filter(trade => {
          const tradeDate = new Date(trade.created_at ?? 0);
          return tradeDate >= today && trade.status === 'completed';
        });

        const notional = todaysTrades.reduce((sum, trade) => {
          // Compute notional from pear_order_payload if available
          const payload = trade.pear_order_payload as { leverage?: number } | null;
          const leverage = payload?.leverage ?? 1;
          return sum + (trade.stake_usd ?? 0) * leverage;
        }, 0);

        setTodayNotional(notional);
      } catch (err) {
        console.error('[usePolicyValidation] Failed to fetch account data:', err);
        setPolicy(DEFAULT_POLICY);
        setTodayNotional(0);
      }
    };

    fetchAccountData();
  }, [accountId]);

  const remainingNotional = policy
    ? Math.max(0, policy.maxDailyNotionalUsd - todayNotional)
    : DEFAULT_POLICY.maxDailyNotionalUsd;

  const validate = useCallback(async (params: TradeValidationParams): Promise<PolicyValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const effectivePolicy = policy ?? DEFAULT_POLICY;
      const violations: PolicyValidationResult['violations'] = [];
      const warnings: string[] = [];

      const estimatedNotional = params.stakeUsd * params.leverage;
      const projectedDailyNotional = todayNotional + estimatedNotional;

      // Check 1: Leverage
      if (params.leverage > effectivePolicy.maxLeverage) {
        violations.push({
          type: 'leverage',
          message: `Leverage ${params.leverage}x exceeds policy maximum of ${effectivePolicy.maxLeverage}x`,
          limit: effectivePolicy.maxLeverage,
          actual: params.leverage,
        });
      }

      // Check 2: Daily notional
      if (projectedDailyNotional > effectivePolicy.maxDailyNotionalUsd) {
        violations.push({
          type: 'notional',
          message: `Projected daily notional $${projectedDailyNotional.toFixed(0)} exceeds limit of $${effectivePolicy.maxDailyNotionalUsd.toFixed(0)}`,
          limit: effectivePolicy.maxDailyNotionalUsd,
          actual: projectedDailyNotional,
        });
      } else if (projectedDailyNotional > effectivePolicy.maxDailyNotionalUsd * 0.8) {
        warnings.push(`Approaching daily notional limit (${((projectedDailyNotional / effectivePolicy.maxDailyNotionalUsd) * 100).toFixed(0)}% used)`);
      }

      // Check 3: Allowed assets
      const allAssets = [
        ...params.longAssets.map(a => a.asset),
        ...params.shortAssets.map(a => a.asset),
      ];
      const disallowedAssets = allAssets.filter(
        asset => !effectivePolicy.allowedPairs.some(
          pair => pair.toUpperCase() === asset.toUpperCase() ||
                  pair.toUpperCase().startsWith(asset.toUpperCase()) ||
                  asset.toUpperCase().startsWith(pair.toUpperCase())
        )
      );

      if (disallowedAssets.length > 0) {
        violations.push({
          type: 'asset',
          message: `Asset(s) ${disallowedAssets.join(', ')} not in allowed pairs`,
          limit: 0,
          actual: disallowedAssets.length,
        });
      }

      const result: PolicyValidationResult = {
        valid: violations.length === 0,
        violations,
        warnings,
        todayNotional,
        remainingNotional: Math.max(0, effectivePolicy.maxDailyNotionalUsd - projectedDailyNotional),
      };

      setValidation(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);

      // Return a failed validation on error
      const failedResult: PolicyValidationResult = {
        valid: false,
        violations: [{
          type: 'notional',
          message: errorMessage,
          limit: 0,
          actual: 0,
        }],
        warnings: [],
        todayNotional: 0,
        remainingNotional: 0,
      };
      setValidation(failedResult);
      return failedResult;
    } finally {
      setIsValidating(false);
    }
  }, [policy, todayNotional]);

  return {
    validation,
    isValidating,
    error,
    validate,
    policy,
    todayNotional,
    remainingNotional,
  };
}
