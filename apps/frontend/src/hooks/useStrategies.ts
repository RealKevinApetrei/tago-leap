'use client';

import { useState, useCallback, useEffect } from 'react';
import { saltApi } from '@/lib/api';

// Strategy definition from salt-service
export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'standard' | 'degen';
  defaultParams: Record<string, unknown>;
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
  status: 'running' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

interface UseStrategiesReturn {
  availableStrategies: StrategyDefinition[];
  userStrategies: UserStrategy[];
  recentRuns: StrategyRun[];
  isLoading: boolean;
  isToggling: boolean;
  error: string | null;
  toggleStrategy: (strategyId: string, active: boolean) => Promise<void>;
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

  // Toggle a strategy on/off
  const toggleStrategy = useCallback(async (strategyId: string, active: boolean) => {
    if (!accountId) {
      setError('No account');
      return;
    }

    setIsToggling(true);
    setError(null);

    try {
      await saltApi.updateStrategy(accountId, strategyId, active);
      // Refresh user strategies
      await fetchUserData();
    } catch (err: any) {
      console.error('[useStrategies] Failed to toggle strategy:', err);
      setError(err?.message || 'Failed to update strategy');
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
