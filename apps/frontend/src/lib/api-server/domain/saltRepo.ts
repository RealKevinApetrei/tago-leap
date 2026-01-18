import type { SupabaseAdminClient } from '../supabase';
import type {
  SaltAccount,
  SaltPolicy,
  SaltStrategy,
  StrategyRun,
  Json,
} from '@tago-leap/shared/types';
import { randomBytes } from 'crypto';

export async function createSaltAccount(
  supabase: SupabaseAdminClient,
  userId: string,
  saltAccountAddress?: string
): Promise<SaltAccount> {
  const address = saltAccountAddress || `0xsalt_${randomBytes(20).toString('hex')}`;

  const { data, error } = await supabase
    .from('salt_accounts')
    .insert({
      user_id: userId,
      salt_account_address: address,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create salt account: ${error.message}`);
  }

  return data;
}

export async function getSaltAccountById(
  supabase: SupabaseAdminClient,
  accountId: string
): Promise<SaltAccount | null> {
  const { data, error } = await supabase
    .from('salt_accounts')
    .select()
    .eq('id', accountId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get salt account: ${error.message}`);
  }

  return data;
}

export interface SaltAccountWithUser extends SaltAccount {
  users: {
    wallet_address: string;
  };
}

export async function getSaltAccountWithUser(
  supabase: SupabaseAdminClient,
  accountId: string
): Promise<SaltAccountWithUser | null> {
  const { data, error } = await supabase
    .from('salt_accounts')
    .select('*, users!inner(wallet_address)')
    .eq('id', accountId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get salt account with user: ${error.message}`);
  }

  return data as SaltAccountWithUser | null;
}

export async function getSaltAccountByWalletAddress(
  supabase: SupabaseAdminClient,
  walletAddress: string
): Promise<SaltAccount | null> {
  const normalizedAddress = walletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('salt_accounts')
    .select('*, users!inner(wallet_address)')
    .eq('users.wallet_address', normalizedAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get salt account by wallet address: ${error.message}`);
  }

  return data;
}

export async function upsertSaltPolicy(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  policy: {
    maxLeverage?: number;
    maxDailyNotionalUsd?: number;
    allowedPairs?: string[];
    maxDrawdownPct?: number;
  }
): Promise<SaltPolicy> {
  const { data: existing } = await supabase
    .from('salt_policies')
    .select()
    .eq('salt_account_id', saltAccountId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('salt_policies')
      .update({
        max_leverage: policy.maxLeverage,
        max_daily_notional_usd: policy.maxDailyNotionalUsd,
        allowed_pairs: policy.allowedPairs as unknown as Json,
        max_drawdown_pct: policy.maxDrawdownPct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update salt policy: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from('salt_policies')
    .insert({
      salt_account_id: saltAccountId,
      max_leverage: policy.maxLeverage,
      max_daily_notional_usd: policy.maxDailyNotionalUsd,
      allowed_pairs: policy.allowedPairs as unknown as Json,
      max_drawdown_pct: policy.maxDrawdownPct,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create salt policy: ${error.message}`);
  }

  return data;
}

export async function getLatestPolicy(
  supabase: SupabaseAdminClient,
  saltAccountId: string
): Promise<SaltPolicy | null> {
  const { data, error } = await supabase
    .from('salt_policies')
    .select()
    .eq('salt_account_id', saltAccountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get salt policy: ${error.message}`);
  }

  return data;
}

export async function createSaltStrategy(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  strategy: {
    strategyId: string;
    params: Record<string, unknown>;
    active: boolean;
  }
): Promise<SaltStrategy> {
  const { data, error } = await supabase
    .from('salt_strategies')
    .insert({
      salt_account_id: saltAccountId,
      strategy_id: strategy.strategyId,
      params: strategy.params as unknown as Json,
      active: strategy.active,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create salt strategy: ${error.message}`);
  }

  return data;
}

export async function upsertSaltStrategy(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  strategy: {
    strategyId: string;
    params?: Record<string, unknown>;
    active: boolean;
  }
): Promise<SaltStrategy> {
  // Check if strategy already exists for this account
  const { data: existing } = await supabase
    .from('salt_strategies')
    .select()
    .eq('salt_account_id', saltAccountId)
    .eq('strategy_id', strategy.strategyId)
    .single();

  if (existing) {
    // Update existing strategy
    const updateData: Record<string, unknown> = {
      active: strategy.active,
      updated_at: new Date().toISOString(),
    };

    // Only update params if provided
    if (strategy.params) {
      updateData.params = strategy.params as unknown as Json;
    }

    const { data, error } = await supabase
      .from('salt_strategies')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update salt strategy: ${error.message}`);
    }

    return data;
  }

  // Create new strategy
  const { data, error } = await supabase
    .from('salt_strategies')
    .insert({
      salt_account_id: saltAccountId,
      strategy_id: strategy.strategyId,
      params: (strategy.params || {}) as unknown as Json,
      active: strategy.active,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create salt strategy: ${error.message}`);
  }

  return data;
}

export async function getStrategiesByAccountId(
  supabase: SupabaseAdminClient,
  saltAccountId: string
): Promise<SaltStrategy[]> {
  const { data, error } = await supabase
    .from('salt_strategies')
    .select()
    .eq('salt_account_id', saltAccountId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get salt strategies: ${error.message}`);
  }

  return data || [];
}

export interface EquityUpdate {
  peak_equity: number;
  current_drawdown_pct: number;
  last_equity_update: string;
}

export async function updateSaltAccountEquity(
  supabase: SupabaseAdminClient,
  accountId: string,
  equity: number
): Promise<EquityUpdate> {
  // Get current account
  const { data: account, error: accountError } = await supabase
    .from('salt_accounts')
    .select('peak_equity')
    .eq('id', accountId)
    .single();

  if (accountError) {
    throw new Error(`Failed to get salt account: ${accountError.message}`);
  }

  // Calculate new peak and drawdown
  const currentPeak = account?.peak_equity || 0;
  const newPeak = Math.max(currentPeak, equity);
  const drawdown = newPeak > 0 ? ((newPeak - equity) / newPeak) * 100 : 0;
  const now = new Date().toISOString();

  // Update the account
  const { error: updateError } = await supabase
    .from('salt_accounts')
    .update({
      peak_equity: newPeak,
      current_drawdown_pct: Math.max(0, drawdown),
      last_equity_update: now,
      updated_at: now,
    })
    .eq('id', accountId);

  if (updateError) {
    throw new Error(`Failed to update salt account equity: ${updateError.message}`);
  }

  return {
    peak_equity: newPeak,
    current_drawdown_pct: Math.max(0, drawdown),
    last_equity_update: now,
  };
}

export async function getActiveSaltAccounts(
  supabase: SupabaseAdminClient
): Promise<(SaltAccount & { user_wallet: string })[]> {
  const { data, error } = await supabase
    .from('salt_accounts')
    .select('*, users!inner(wallet_address)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get active salt accounts: ${error.message}`);
  }

  return (data || []).map(account => ({
    ...account,
    user_wallet: (account as any).users?.wallet_address,
  }));
}

export interface StrategyRunWithDefinition extends StrategyRun {
  strategy_definition_id: string;
}

export async function getStrategyRunsByAccountId(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  limit: number = 20
): Promise<StrategyRunWithDefinition[]> {
  // Fetch strategies with both UUID (id) and definition ID (strategy_id)
  const { data: strategies, error: strategiesError } = await supabase
    .from('salt_strategies')
    .select('id, strategy_id')
    .eq('salt_account_id', saltAccountId);

  if (strategiesError) {
    throw new Error(`Failed to get strategies: ${strategiesError.message}`);
  }

  if (!strategies || strategies.length === 0) {
    return [];
  }

  // Map UUID -> definition ID (e.g., "550e8400-..." -> "take-profit")
  const strategyDefMap = new Map<string, string>(
    strategies.map(s => [s.id, s.strategy_id])
  );
  const strategyIds = strategies.map(s => s.id);

  const { data, error } = await supabase
    .from('strategy_runs')
    .select('*')
    .in('strategy_id', strategyIds)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get strategy runs: ${error.message}`);
  }

  // Enrich runs with the strategy definition ID
  return (data || []).map(run => ({
    ...run,
    strategy_definition_id: strategyDefMap.get(run.strategy_id) || 'unknown',
  }));
}
