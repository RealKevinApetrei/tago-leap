'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { saltApi, pearApi } from '@/lib/api';

interface SaltAccount {
  id: string;
  salt_account_address: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SaltPolicy {
  id: string;
  salt_account_id: string;
  max_leverage: number | null;
  max_daily_notional_usd: number | null;
  allowed_pairs: string[] | null;
  max_drawdown_pct: number | null;
}

interface SaltStrategy {
  id: string;
  salt_account_id: string;
  strategy_id: string;
  params: Record<string, unknown>;
  active: boolean;
}

interface Trade {
  id: string;
  narrative_id: string;
  direction: string;
  stake_usd: number;
  status: string;
  created_at: string;
  source: string;
  account_ref: string | null;
}

interface UseSaltAccountReturn {
  account: SaltAccount | null;
  policy: SaltPolicy | null;
  strategies: SaltStrategy[];
  trades: Trade[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createAccount: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  refreshTrades: () => Promise<void>;
}

export function useSaltAccount(): UseSaltAccountReturn {
  const { address, isConnected } = useAccount();

  const [account, setAccount] = useState<SaltAccount | null>(null);
  const [policy, setPolicy] = useState<SaltPolicy | null>(null);
  const [strategies, setStrategies] = useState<SaltStrategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch account details by ID (including trades)
  const fetchAccountDetails = useCallback(async (accountId: string) => {
    try {
      const details = await saltApi.getAccount(accountId);
      setAccount(details.account);
      setPolicy(details.policy);
      setStrategies(details.strategies || []);

      // Also fetch trades if account has salt_account_address
      if (details.account?.salt_account_address) {
        try {
          const accountTrades = await pearApi.getTradesByAccount(details.account.salt_account_address);
          setTrades(accountTrades);
        } catch (tradeErr) {
          console.error('[useSaltAccount] Failed to fetch trades:', tradeErr);
          // Don't fail the whole operation, just log it
        }
      }
    } catch (err) {
      console.error('[useSaltAccount] Failed to fetch account details:', err);
    }
  }, []);

  // Refresh trades for the account
  const refreshTrades = useCallback(async () => {
    if (!account?.salt_account_address) return;

    try {
      const accountTrades = await pearApi.getTradesByAccount(account.salt_account_address);
      setTrades(accountTrades);
    } catch (err) {
      console.error('[useSaltAccount] Failed to fetch trades:', err);
    }
  }, [account?.salt_account_address]);

  // Refresh account data
  const refreshAccount = useCallback(async () => {
    if (!address) {
      setAccount(null);
      setPolicy(null);
      setStrategies([]);
      setTrades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to create/get account - this endpoint returns existing account if it exists
      const result = await saltApi.createAccount({ userWalletAddress: address });

      if (result.account) {
        await fetchAccountDetails(result.account.id);

        // Fetch trades
        if (result.account.salt_account_address) {
          const accountTrades = await pearApi.getTradesByAccount(result.account.salt_account_address);
          setTrades(accountTrades);
        }
      }
    } catch (err: any) {
      // Account might not exist yet, that's OK
      console.error('[useSaltAccount] Failed to refresh account:', err);
      setAccount(null);
      setPolicy(null);
      setStrategies([]);
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchAccountDetails]);

  // Create a new Salt account
  const createAccount = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await saltApi.createAccount({ userWalletAddress: address });

      if (result.account) {
        await fetchAccountDetails(result.account.id);
      }
    } catch (err: any) {
      console.error('[useSaltAccount] Failed to create account:', err);
      setError(err?.message || 'Failed to create Salt account');
    } finally {
      setIsCreating(false);
    }
  }, [address, fetchAccountDetails]);

  // Load account on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      refreshAccount();
    } else {
      setAccount(null);
      setPolicy(null);
      setStrategies([]);
      setTrades([]);
      setIsLoading(false);
    }
  }, [isConnected, address, refreshAccount]);

  return {
    account,
    policy,
    strategies,
    trades,
    isLoading,
    isCreating,
    error,
    createAccount,
    refreshAccount,
    refreshTrades,
  };
}
