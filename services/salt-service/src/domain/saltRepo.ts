import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type {
  SaltAccount,
  SaltPolicy,
  SaltStrategy,
  StrategyRun,
  TablesInsert,
  Json,
} from '@tago-leap/shared/types';
import { randomBytes } from 'crypto';

// Salt Accounts

export async function createSaltAccount(
  supabase: SupabaseAdminClient,
  userId: string,
  saltAccountAddress?: string
): Promise<SaltAccount> {
  // Use provided address or generate a placeholder
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

export async function getSaltAccountByUserId(
  supabase: SupabaseAdminClient,
  userId: string
): Promise<SaltAccount | null> {
  const { data, error } = await supabase
    .from('salt_accounts')
    .select()
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get salt account: ${error.message}`);
  }

  return data;
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

// Salt Policies

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
  // Check if policy exists
  const { data: existing } = await supabase
    .from('salt_policies')
    .select()
    .eq('salt_account_id', saltAccountId)
    .single();

  if (existing) {
    // Update existing policy
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

  // Create new policy
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

// Salt Strategies

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

export async function getActiveStrategies(
  supabase: SupabaseAdminClient
): Promise<SaltStrategy[]> {
  const { data, error } = await supabase
    .from('salt_strategies')
    .select()
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to get active strategies: ${error.message}`);
  }

  return data || [];
}

export async function updateStrategyStatus(
  supabase: SupabaseAdminClient,
  strategyId: string,
  active: boolean
): Promise<SaltStrategy> {
  const { data, error } = await supabase
    .from('salt_strategies')
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', strategyId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update strategy status: ${error.message}`);
  }

  return data;
}

// Strategy Runs

export async function createStrategyRun(
  supabase: SupabaseAdminClient,
  strategyId: string
): Promise<StrategyRun> {
  const { data, error } = await supabase
    .from('strategy_runs')
    .insert({
      strategy_id: strategyId,
      status: 'running',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create strategy run: ${error.message}`);
  }

  return data;
}

export async function completeStrategyRun(
  supabase: SupabaseAdminClient,
  runId: string,
  result: Record<string, unknown>,
  error?: string
): Promise<StrategyRun> {
  const { data, error: dbError } = await supabase
    .from('strategy_runs')
    .update({
      status: error ? 'failed' : 'completed',
      result: result as unknown as Json,
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .select()
    .single();

  if (dbError) {
    throw new Error(`Failed to complete strategy run: ${dbError.message}`);
  }

  return data;
}

export async function getStrategyRunsByAccountId(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  limit: number = 20
): Promise<StrategyRun[]> {
  // Get strategy IDs for this account
  const { data: strategies, error: strategiesError } = await supabase
    .from('salt_strategies')
    .select('id')
    .eq('salt_account_id', saltAccountId);

  if (strategiesError) {
    throw new Error(`Failed to get strategies: ${strategiesError.message}`);
  }

  if (!strategies || strategies.length === 0) {
    return [];
  }

  const strategyIds = strategies.map(s => s.id);

  // Get recent runs for these strategies
  const { data, error } = await supabase
    .from('strategy_runs')
    .select('*')
    .in('strategy_id', strategyIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get strategy runs: ${error.message}`);
  }

  return data || [];
}
