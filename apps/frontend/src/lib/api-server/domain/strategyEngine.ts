/**
 * Strategy Execution Engine
 *
 * Production-ready engine that:
 * 1. Fetches all accounts with active strategies
 * 2. Executes each strategy with proper error handling
 * 3. Logs all runs to strategy_runs table
 * 4. Respects policy limits
 *
 * [SALT] Robo managers & autonomous agents
 */

import { getSupabaseAdmin, SupabaseAdminClient } from '../supabase';
import {
  getActiveSaltAccounts,
  getStrategiesByAccountId,
  getLatestPolicy,
  getSaltAccountWithUser,
} from './saltRepo';
import type { SaltAccount, SaltPolicy, SaltStrategy } from '@tago-leap/shared/types';
import {
  executeTakeProfitStrategy,
  executeTrailingStopStrategy,
  executeVWAPExitStrategy,
  executeADXMomentumStrategy,
  type TakeProfitParams,
  type TrailingStopParams,
  type VWAPExitParams,
  type ADXMomentumParams,
} from './strategies';

// Strategy execution result
export interface StrategyExecutionResult {
  success: boolean;
  action?: 'none' | 'trade_executed' | 'position_closed';
  details?: Record<string, unknown>;
  error?: string;
}

// Strategy run record
export interface StrategyRunRecord {
  strategyId: string;
  strategyType: string;
  saltAccountId: string;
  walletAddress: string;
  status: 'running' | 'completed' | 'failed';
  result: StrategyExecutionResult | null;
  startedAt: Date;
  completedAt: Date | null;
}

// Create a strategy run record in the database
export async function createStrategyRun(
  supabase: SupabaseAdminClient,
  data: {
    strategyId: string;
    status: 'running' | 'completed' | 'failed';
    result?: Record<string, unknown> | null;
    error?: string | null;
    startedAt: Date;
    completedAt?: Date | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('strategy_runs')
    .insert({
      strategy_id: data.strategyId,
      status: data.status,
      result: data.result || null,
      error: data.error || null,
      started_at: data.startedAt.toISOString(),
      completed_at: data.completedAt?.toISOString() || null,
    });

  if (error) {
    console.error('[StrategyEngine] Failed to create strategy run:', error);
  }
}

// Update a strategy run record
export async function updateStrategyRun(
  supabase: SupabaseAdminClient,
  strategyId: string,
  startedAt: Date,
  updates: {
    status: 'completed' | 'failed';
    result?: Record<string, unknown> | null;
    error?: string | null;
    completedAt: Date;
  }
): Promise<void> {
  const { error } = await supabase
    .from('strategy_runs')
    .update({
      status: updates.status,
      result: updates.result || null,
      error: updates.error || null,
      completed_at: updates.completedAt.toISOString(),
    })
    .eq('strategy_id', strategyId)
    .eq('started_at', startedAt.toISOString());

  if (error) {
    console.error('[StrategyEngine] Failed to update strategy run:', error);
  }
}

// Execute a single strategy
async function executeStrategy(
  supabase: SupabaseAdminClient,
  strategy: SaltStrategy,
  account: SaltAccount & { user_wallet: string },
  policy: SaltPolicy | null
): Promise<StrategyExecutionResult> {
  const strategyType = strategy.strategy_id;
  const params = strategy.params as Record<string, unknown>;

  console.log(`[StrategyEngine] Executing ${strategyType} for account ${account.id}`);

  switch (strategyType) {
    case 'take-profit':
      return executeTakeProfitStrategy(
        account.user_wallet,
        account.id,
        params as TakeProfitParams,
        policy
      );

    case 'trailing-stop':
      return executeTrailingStopStrategy(
        account.user_wallet,
        account.id,
        params as TrailingStopParams,
        policy
      );

    case 'vwap-exit':
      return executeVWAPExitStrategy(
        account.user_wallet,
        account.id,
        params as VWAPExitParams,
        policy
      );

    case 'adx-momentum':
      return executeADXMomentumStrategy(
        account.user_wallet,
        account.id,
        params as ADXMomentumParams,
        policy
      );

    default:
      return {
        success: false,
        error: `Unknown strategy type: ${strategyType}`,
      };
  }
}

// Main engine: run all active strategies for all accounts
export async function runStrategyEngine(): Promise<{
  accountsProcessed: number;
  strategiesExecuted: number;
  tradesExecuted: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const results = {
    accountsProcessed: 0,
    strategiesExecuted: 0,
    tradesExecuted: 0,
    errors: [] as string[],
  };

  console.log('[StrategyEngine] Starting strategy execution cycle...');

  try {
    // Get all active accounts
    const accounts = await getActiveSaltAccounts(supabase);
    console.log(`[StrategyEngine] Found ${accounts.length} accounts`);

    for (const account of accounts) {
      try {
        // Get active strategies for this account
        const strategies = await getStrategiesByAccountId(supabase, account.id);
        const activeStrategies = strategies.filter(s => s.active);

        if (activeStrategies.length === 0) {
          continue;
        }

        results.accountsProcessed++;
        console.log(`[StrategyEngine] Account ${account.id} has ${activeStrategies.length} active strategies`);

        // Get policy for this account
        const policy = await getLatestPolicy(supabase, account.id);

        for (const strategy of activeStrategies) {
          const startedAt = new Date();

          try {
            // Create "running" record
            await createStrategyRun(supabase, {
              strategyId: strategy.id,
              status: 'running',
              startedAt,
            });

            // Execute the strategy
            const result = await executeStrategy(supabase, strategy, account, policy);
            results.strategiesExecuted++;

            if (result.action === 'trade_executed' || result.action === 'position_closed') {
              results.tradesExecuted++;
            }

            // Update with result
            await updateStrategyRun(supabase, strategy.id, startedAt, {
              status: result.success ? 'completed' : 'failed',
              result: result as Record<string, unknown>,
              error: result.error || null,
              completedAt: new Date(),
            });

            console.log(`[StrategyEngine] Strategy ${strategy.strategy_id} completed:`, result);
          } catch (strategyError: any) {
            const errorMessage = strategyError?.message || 'Unknown strategy error';
            results.errors.push(`Strategy ${strategy.id}: ${errorMessage}`);

            await updateStrategyRun(supabase, strategy.id, startedAt, {
              status: 'failed',
              error: errorMessage,
              completedAt: new Date(),
            });

            console.error(`[StrategyEngine] Strategy ${strategy.id} failed:`, strategyError);
          }
        }
      } catch (accountError: any) {
        const errorMessage = accountError?.message || 'Unknown account error';
        results.errors.push(`Account ${account.id}: ${errorMessage}`);
        console.error(`[StrategyEngine] Account ${account.id} failed:`, accountError);
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown engine error';
    results.errors.push(`Engine: ${errorMessage}`);
    console.error('[StrategyEngine] Engine failed:', error);
  }

  console.log('[StrategyEngine] Cycle complete:', results);
  return results;
}

// Run strategies for a specific account only
export async function runStrategiesForAccount(
  accountId: string
): Promise<StrategyExecutionResult[]> {
  const supabase = getSupabaseAdmin();
  const results: StrategyExecutionResult[] = [];

  try {
    const account = await getSaltAccountWithUser(supabase, accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const strategies = await getStrategiesByAccountId(supabase, accountId);
    const activeStrategies = strategies.filter(s => s.active);
    const policy = await getLatestPolicy(supabase, accountId);

    const accountWithWallet = {
      ...account,
      user_wallet: account.users.wallet_address,
    };

    for (const strategy of activeStrategies) {
      const startedAt = new Date();

      try {
        await createStrategyRun(supabase, {
          strategyId: strategy.id,
          status: 'running',
          startedAt,
        });

        const result = await executeStrategy(supabase, strategy, accountWithWallet, policy);
        results.push(result);

        await updateStrategyRun(supabase, strategy.id, startedAt, {
          status: result.success ? 'completed' : 'failed',
          result: result as Record<string, unknown>,
          error: result.error || null,
          completedAt: new Date(),
        });
      } catch (error: any) {
        const errorResult: StrategyExecutionResult = {
          success: false,
          error: error?.message || 'Unknown error',
        };
        results.push(errorResult);

        await updateStrategyRun(supabase, strategy.id, startedAt, {
          status: 'failed',
          error: error?.message || 'Unknown error',
          completedAt: new Date(),
        });
      }
    }
  } catch (error: any) {
    results.push({
      success: false,
      error: error?.message || 'Failed to run strategies',
    });
  }

  return results;
}
