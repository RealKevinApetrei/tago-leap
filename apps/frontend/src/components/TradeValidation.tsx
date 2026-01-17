'use client';

import { useMemo } from 'react';
import type { HyperliquidBalance, ValidationCheck, ValidationStatus } from '@tago-leap/shared/types';

interface TradeValidationProps {
  stakeUsd: number;
  leverage: number;
  maxLeverage: number;
  balance: HyperliquidBalance | null;
  balanceLoading: boolean;
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
  allowedPairs?: string[];
  maxDailyNotional?: number;
  todayNotional?: number;
}

interface ValidationCheckResult extends ValidationCheck {
  details?: string;
}

export function TradeValidation({
  stakeUsd,
  leverage,
  maxLeverage,
  balance,
  balanceLoading,
  longAssets,
  shortAssets,
  allowedPairs = ['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP'],
  maxDailyNotional = 10000,
  todayNotional = 0,
}: TradeValidationProps) {
  const notionalRequired = stakeUsd * leverage;
  const projectedDailyNotional = todayNotional + notionalRequired;
  const dailyNotionalPercent = (projectedDailyNotional / maxDailyNotional) * 100;

  const checks = useMemo<ValidationCheckResult[]>(() => {
    const result: ValidationCheckResult[] = [];

    // 1. Balance check
    if (balanceLoading) {
      result.push({
        id: 'balance',
        label: 'Hyperliquid Balance',
        status: 'pending',
        message: 'Loading balance...',
      });
    } else if (!balance) {
      result.push({
        id: 'balance',
        label: 'Hyperliquid Balance',
        status: 'failed',
        message: 'Unable to fetch balance',
      });
    } else {
      const hasSufficientBalance = balance.availableBalance >= notionalRequired;
      result.push({
        id: 'balance',
        label: 'Hyperliquid Balance',
        status: hasSufficientBalance ? 'passed' : 'failed',
        message: hasSufficientBalance
          ? `$${balance.availableBalance.toFixed(2)} available`
          : `Need $${notionalRequired.toFixed(2)}, have $${balance.availableBalance.toFixed(2)}`,
        details: hasSufficientBalance ? undefined : `Shortfall: $${(notionalRequired - balance.availableBalance).toFixed(2)}`,
      });
    }

    // 2. Margin sufficiency check
    if (balance && !balanceLoading) {
      const marginOk = balance.availableBalance >= notionalRequired;
      result.push({
        id: 'margin',
        label: 'Margin Requirement',
        status: marginOk ? 'passed' : 'failed',
        message: marginOk
          ? `$${stakeUsd.toFixed(2)} @ ${leverage}x = $${notionalRequired.toFixed(2)} notional`
          : `Insufficient margin for $${notionalRequired.toFixed(2)} position`,
      });
    }

    // 3. Account health check
    if (balance && !balanceLoading) {
      const healthStatus: ValidationStatus =
        balance.accountHealth >= 70 ? 'passed' :
        balance.accountHealth >= 50 ? 'warning' : 'failed';

      result.push({
        id: 'health',
        label: 'Account Health',
        status: healthStatus,
        message: `${balance.accountHealth.toFixed(0)}%${healthStatus === 'warning' ? ' - Consider reducing exposure' : healthStatus === 'failed' ? ' - High liquidation risk' : ' - Good'}`,
      });
    }

    // 4. Leverage policy check
    const leverageOk = leverage <= maxLeverage;
    result.push({
      id: 'leverage',
      label: 'Leverage Limit',
      status: leverageOk ? 'passed' : 'failed',
      message: leverageOk
        ? `${leverage}x (max ${maxLeverage}x)`
        : `${leverage}x exceeds policy max of ${maxLeverage}x`,
    });

    // 5. Daily notional check
    const notionalStatus: ValidationStatus =
      projectedDailyNotional <= maxDailyNotional
        ? (dailyNotionalPercent >= 80 ? 'warning' : 'passed')
        : 'failed';

    result.push({
      id: 'dailyNotional',
      label: 'Daily Notional',
      status: notionalStatus,
      message: notionalStatus === 'failed'
        ? `$${projectedDailyNotional.toFixed(0)} exceeds limit of $${maxDailyNotional.toFixed(0)}`
        : `$${projectedDailyNotional.toFixed(0)} / $${maxDailyNotional.toFixed(0)} (${dailyNotionalPercent.toFixed(0)}%)`,
      details: notionalStatus === 'warning' ? 'Approaching daily limit' : undefined,
    });

    // 6. Asset allowlist check
    const allAssets = [...longAssets.map(a => a.asset), ...shortAssets.map(a => a.asset)];
    const disallowedAssets = allAssets.filter(asset => !allowedPairs.includes(asset));
    const assetsOk = disallowedAssets.length === 0;

    result.push({
      id: 'assets',
      label: 'Allowed Assets',
      status: assetsOk ? 'passed' : 'failed',
      message: assetsOk
        ? `${allAssets.join(', ')} allowed`
        : `${disallowedAssets.join(', ')} not in allowed list`,
    });

    return result;
  }, [balance, balanceLoading, stakeUsd, leverage, maxLeverage, notionalRequired, projectedDailyNotional, dailyNotionalPercent, maxDailyNotional, longAssets, shortAssets, allowedPairs]);

  const hasErrors = checks.some(c => c.status === 'failed');
  const hasWarnings = checks.some(c => c.status === 'warning');
  const isPending = checks.some(c => c.status === 'pending');

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Pre-Trade Validation</span>
        {isPending ? (
          <span className="text-xs text-white/40">Checking...</span>
        ) : hasErrors ? (
          <span className="text-xs text-red-400">Cannot execute</span>
        ) : hasWarnings ? (
          <span className="text-xs text-yellow-400">Warnings</span>
        ) : (
          <span className="text-xs text-green-400">All checks passed</span>
        )}
      </div>

      <div className="divide-y divide-white/[0.05]">
        {checks.map((check) => (
          <div key={check.id} className="px-4 py-2.5 flex items-start gap-3">
            <div className="mt-0.5">
              {check.status === 'pending' ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              ) : check.status === 'passed' ? (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : check.status === 'warning' ? (
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/50">{check.label}</span>
              </div>
              <p className={`text-sm font-light ${
                check.status === 'passed' ? 'text-white/70' :
                check.status === 'warning' ? 'text-yellow-400' :
                check.status === 'failed' ? 'text-red-400' :
                'text-white/40'
              }`}>
                {check.message}
              </p>
              {check.details && (
                <p className="text-xs text-white/40 mt-0.5">{check.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useTradeValidation(checks: ValidationCheck[]) {
  const canTrade = checks.every(c => c.status === 'passed' || c.status === 'warning');
  const errors = checks.filter(c => c.status === 'failed');
  const warnings = checks.filter(c => c.status === 'warning');

  return { canTrade, errors, warnings };
}
