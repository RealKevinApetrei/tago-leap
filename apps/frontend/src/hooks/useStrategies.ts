'use client';

import { useState, useCallback, useEffect } from 'react';
import { saltApi } from '@/lib/api';

// Strategy definition from salt-service
export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'standard' | 'degen';
  defaultParams?: Record<string, unknown>;
}

// User's strategy instance
export interface UserStrategy {
  id: string;
  salt_account_id: string;
  strategy_id: string;
  params: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Strategy run log
export interface StrategyRun {
  id: string;
  strategy_id: string;
  strategy_definition_id: string; // The strategy type (e.g., "take-profit")
  status: 'running' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ToggleResult {
  success: boolean;
  error?: string;
}

interface UseStrategiesReturn {
  availableStrategies: StrategyDefinition[];
  userStrategies: UserStrategy[];
  recentRuns: StrategyRun[];
  isLoading: boolean;
  isToggling: boolean;
  error: string | null;
  toggleStrategy: (strategyId: string, active: boolean, params?: Record<string, unknown>) => Promise<ToggleResult>;
  refreshRuns: () => Promise<void>;
}

export function useStrategies(accountId: string | null): UseStrategiesReturn {
  const [availableStrategies, setAvailableStrategies] = useState<StrategyDefinition[]>([]);
  const [userStrategies, setUserStrategies] = useState<UserStrategy[]>([]);
  const [recentRuns, setRecentRuns] = useState<StrategyRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available strategies
  const fetchAvailableStrategies = useCallback(async () => {
    try {
      const strategies = await saltApi.getStrategies();
      setAvailableStrategies(strategies);
    } catch (err: any) {
      console.error('[useStrategies] Failed to fetch available strategies:', err);
    }
  }, []);

  // Fetch user's strategies and recent runs
  const fetchUserData = useCallback(async () => {
    if (!accountId) {
      setUserStrategies([]);
      setRecentRuns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get account details (includes strategies)
      const accountData = await saltApi.getAccount(accountId);
      setUserStrategies(accountData.strategies || []);

      // Get recent strategy runs
      const runs = await saltApi.getStrategyRuns(accountId, 10);
      setRecentRuns(runs || []);
    } catch (err: any) {
      console.error('[useStrategies] Failed to fetch user data:', err);
      setError(err?.message || 'Failed to load strategies');
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  // Refresh only the runs
  const refreshRuns = useCallback(async () => {
    if (!accountId) return;

    try {
      const runs = await saltApi.getStrategyRuns(accountId, 10);
      setRecentRuns(runs || []);
    } catch (err: any) {
      console.error('[useStrategies] Failed to refresh runs:', err);
    }
  }, [accountId]);

  // Toggle a strategy on/off (with optional params)
  const toggleStrategy = useCallback(async (strategyId: string, active: boolean, params?: Record<string, unknown>): Promise<ToggleResult> => {
    if (!accountId) {
      return { success: false, error: 'No account connected' };
    }

    // Optimistic update - flip the switch immediately
    setUserStrategies(prev => {
      const existing = prev.find(s => s.strategy_id === strategyId);
      if (existing) {
        // Update existing strategy
        return prev.map(s =>
          s.strategy_id === strategyId
            ? { ...s, active, params: params ? { ...s.params, ...params } : s.params }
            : s
        );
      } else {
        // Add new strategy optimistically
        return [...prev, {
          id: `temp-${strategyId}`,
          salt_account_id: accountId,
          strategy_id: strategyId,
          params: params || {},
          active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    });

    setIsToggling(true);
    setError(null);

    try {
      // API returns the updated strategy
      const updatedStrategy = await saltApi.updateStrategy(accountId, strategyId, active, params);

      // Update state with the server response (replaces optimistic update with real data)
      setUserStrategies(prev => {
        const exists = prev.some(s => s.strategy_id === strategyId);
        if (exists) {
          return prev.map(s =>
            s.strategy_id === strategyId ? updatedStrategy : s
          );
        } else {
          return [...prev.filter(s => s.id !== `temp-${strategyId}`), updatedStrategy];
        }
      });

      return { success: true };
    } catch (err: any) {
      console.error('[useStrategies] Failed to toggle strategy:', err);
      // Revert optimistic update on error
      await fetchUserData();
      const errorMsg = err?.message || 'Failed to update strategy';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsToggling(false);
    }
  }, [accountId, fetchUserData]);

  // Load data on mount and when accountId changes
  useEffect(() => {
    fetchAvailableStrategies();
    fetchUserData();
  }, [fetchAvailableStrategies, fetchUserData]);

  return {
    availableStrategies,
    userStrategies,
    recentRuns,
    isLoading,
    isToggling,
    error,
    toggleStrategy,
    refreshRuns,
  };
}
