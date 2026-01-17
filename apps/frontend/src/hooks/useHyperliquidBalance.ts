'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { HyperliquidBalance } from '@tago-leap/shared/types';

// Auto-refresh interval in milliseconds (15 seconds)
const AUTO_REFRESH_INTERVAL = 15_000;

interface UseHyperliquidBalanceReturn {
  balance: HyperliquidBalance | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to query the user's Hyperliquid perps account balance
 *
 * Returns available balance, equity, margin usage, and account health.
 * Direct API call to Hyperliquid (like useAgentWallet and useBuilderFee).
 */
export function useHyperliquidBalance(): UseHyperliquidBalanceReturn {
  const { address, isConnected } = useAccount();

  const [balance, setBalance] = useState<HyperliquidBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (silent = false) => {
    if (!address) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Query Hyperliquid clearinghouse state
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
        }),
      });

      if (!response.ok) {
        throw new Error(`Hyperliquid API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useHyperliquidBalance] Raw response:', data);

      // Parse the clearinghouse state
      // Response structure: { marginSummary: {...}, assetPositions: [...] }
      const marginSummary = data.marginSummary || {};

      // Parse values from marginSummary
      const accountValue = parseFloat(marginSummary.accountValue || '0');
      const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');
      const totalNtlPos = parseFloat(marginSummary.totalNtlPos || '0');
      const totalRawUsd = parseFloat(marginSummary.totalRawUsd || '0');

      // Calculate available balance and health
      const availableBalance = accountValue - totalMarginUsed;

      // Calculate unrealized PnL by summing from all positions
      // This is the correct approach - each position has its own unrealizedPnl
      const assetPositions = data.assetPositions || [];
      const unrealizedPnl = assetPositions.reduce((sum: number, ap: any) => {
        const positionPnl = parseFloat(ap.position?.unrealizedPnl || '0');
        return sum + positionPnl;
      }, 0);

      // Maintenance margin is typically ~5% of position notional
      const maintenanceMargin = totalNtlPos * 0.05;

      // Account health: ratio of excess margin to required margin
      // 100% = no positions or fully margined
      // Lower = higher risk of liquidation
      let accountHealth = 100;
      if (maintenanceMargin > 0) {
        const excessMargin = accountValue - maintenanceMargin;
        accountHealth = Math.min(100, Math.max(0, (excessMargin / accountValue) * 100));
      }

      const parsedBalance: HyperliquidBalance = {
        availableBalance,
        equity: accountValue,
        lockedMargin: totalMarginUsed,
        maintenanceMargin,
        accountHealth,
        unrealizedPnl,
        raw: data,
      };

      console.log('[useHyperliquidBalance] Parsed balance:', {
        availableBalance: parsedBalance.availableBalance.toFixed(2),
        equity: parsedBalance.equity.toFixed(2),
        lockedMargin: parsedBalance.lockedMargin.toFixed(2),
        accountHealth: parsedBalance.accountHealth.toFixed(1),
        unrealizedPnl: parsedBalance.unrealizedPnl.toFixed(2),
      });

      setBalance(parsedBalance);
    } catch (err) {
      console.error('[useHyperliquidBalance] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch balance on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchBalance();
    } else {
      setBalance(null);
      setIsLoading(false);
    }
  }, [isConnected, address, fetchBalance]);

  // Auto-refresh polling - picks up deposits/withdrawals made on Hyperliquid directly
  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    const intervalId = setInterval(() => {
      // Silent refresh - don't show loading state for auto-refresh
      fetchBalance(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected, address, fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refresh: fetchBalance,
  };
}
