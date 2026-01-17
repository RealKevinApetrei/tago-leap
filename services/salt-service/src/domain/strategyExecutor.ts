import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type { Trade, SaltPolicy } from '@tago-leap/shared/types';
import { getSaltAccountWithUser, getLatestPolicy } from './saltRepo.js';
import { getTodayNotional, validateTradeAgainstPolicy, PolicyValidationResult } from './policyEnforcer.js';
import {
  executeNarrativeTrade,
  validateTrade,
  checkUserAuth,
  executePairTrade,
  ExecutePairTradeParams,
} from '../clients/pearServiceClient.js';
import { defaultPolicy } from './policyTypes.js';

/**
 * Trade execution request params
 */
export interface ExecuteTradeParams {
  narrativeId: string;
  direction: 'longNarrative' | 'shortNarrative';
  stakeUsd: number;
  riskProfile: 'conservative' | 'standard' | 'degen';
  mode: 'pair' | 'basket';
}

/**
 * Trade execution result
 */
export interface TradeExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  policyValidation?: PolicyValidationResult;
}

/**
 * Execute a strategy trade for a Salt account.
 *
 * Flow:
 * 1. Get Salt account and user info
 * 2. Check user is authenticated with Pear
 * 3. Validate trade via pear-service `/bets/validate`
 * 4. Check against Salt policy
 * 5. Execute via pear-service `/bets/execute-narrative`
 */
export async function executeStrategyTrade(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  params: ExecuteTradeParams
): Promise<TradeExecutionResult> {
  console.log('[StrategyExecutor] Starting trade execution:', {
    saltAccountId,
    ...params,
  });

  // 1. Get Salt account and user info
  const account = await getSaltAccountWithUser(supabase, saltAccountId);
  if (!account) {
    return {
      success: false,
      error: `Salt account not found: ${saltAccountId}`,
    };
  }

  const userWalletAddress = account.users.wallet_address;
  const saltAccountAddress = account.salt_account_address;

  console.log('[StrategyExecutor] Found account:', {
    saltAccountId,
    saltAccountAddress,
    userWalletAddress,
  });

  // 2. Check user is authenticated with Pear
  const authStatus = await checkUserAuth(userWalletAddress);
  if (!authStatus.authenticated) {
    return {
      success: false,
      error: 'User is not authenticated with Pear Protocol. Please sign in first.',
    };
  }

  // 3. Validate trade via pear-service (dry-run)
  const validationResult = await validateTrade({
    narrativeId: params.narrativeId,
    direction: params.direction,
    stakeUsd: params.stakeUsd,
    riskProfile: params.riskProfile,
    mode: params.mode,
  });

  if (!validationResult.valid) {
    return {
      success: false,
      error: `Trade validation failed: ${validationResult.errors.join(', ')}`,
    };
  }

  if (!validationResult.computedPayload) {
    return {
      success: false,
      error: 'Trade validation returned no computed payload',
    };
  }

  // 4. Check against Salt policy
  const policy = await getLatestPolicy(supabase, saltAccountId);

  // Use database policy or fall back to default
  const effectivePolicy: SaltPolicy = policy || {
    id: 'default',
    salt_account_id: saltAccountId,
    max_leverage: defaultPolicy.maxLeverage,
    max_daily_notional_usd: defaultPolicy.maxDailyNotionalUsd,
    allowed_pairs: defaultPolicy.allowedPairs,
    max_drawdown_pct: defaultPolicy.maxDrawdownPct,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const todayNotional = await getTodayNotional(supabase, saltAccountAddress);

  const policyValidation = validateTradeAgainstPolicy(
    effectivePolicy,
    validationResult.computedPayload,
    todayNotional
  );

  if (!policyValidation.allowed) {
    return {
      success: false,
      error: `Policy violation: ${policyValidation.violations.join(', ')}`,
      policyValidation,
    };
  }

  // Log warnings if any
  if (policyValidation.warnings.length > 0) {
    console.log('[StrategyExecutor] Policy warnings:', policyValidation.warnings);
  }

  // 5. Execute via pear-service
  try {
    const trade = await executeNarrativeTrade({
      userWalletAddress,
      narrativeId: params.narrativeId,
      direction: params.direction,
      stakeUsd: params.stakeUsd,
      riskProfile: params.riskProfile,
      mode: params.mode,
      accountRef: saltAccountAddress,
      source: 'salt',
    });

    console.log('[StrategyExecutor] Trade executed successfully:', trade.id);

    return {
      success: true,
      trade,
      policyValidation,
    };
  } catch (err) {
    console.error('[StrategyExecutor] Trade execution failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during trade execution',
      policyValidation,
    };
  }
}

/**
 * Direct pair trade request params (AI-generated trades with explicit assets)
 */
export interface ExecuteDirectPairTradeParams {
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
  stakeUsd: number;
  leverage: number;
  slippage?: number;
}

/**
 * Execute a direct pair trade for a Salt account.
 * This is used for AI-generated trades that specify assets directly (not via narrative ID).
 *
 * Flow:
 * 1. Get Salt account and user info
 * 2. Check user is authenticated with Pear
 * 3. Validate against Salt policy (leverage, notional, allowed pairs)
 * 4. Execute via pear-service `/bets/execute` with source='salt'
 */
export async function executeDirectPairTrade(
  supabase: SupabaseAdminClient,
  saltAccountId: string,
  params: ExecuteDirectPairTradeParams
): Promise<TradeExecutionResult> {
  console.log('[StrategyExecutor] Starting direct pair trade execution:', {
    saltAccountId,
    longAssets: params.longAssets.map(a => a.asset),
    shortAssets: params.shortAssets.map(a => a.asset),
    stakeUsd: params.stakeUsd,
    leverage: params.leverage,
  });

  // 1. Get Salt account and user info
  const account = await getSaltAccountWithUser(supabase, saltAccountId);
  if (!account) {
    return {
      success: false,
      error: `Salt account not found: ${saltAccountId}`,
    };
  }

  const userWalletAddress = account.users.wallet_address;
  const saltAccountAddress = account.salt_account_address;

  console.log('[StrategyExecutor] Found account:', {
    saltAccountId,
    saltAccountAddress,
    userWalletAddress,
  });

  // 2. Check user is authenticated with Pear
  const authStatus = await checkUserAuth(userWalletAddress);
  if (!authStatus.authenticated) {
    return {
      success: false,
      error: 'User is not authenticated with Pear Protocol. Please sign in first.',
    };
  }

  // 3. Check against Salt policy
  const policy = await getLatestPolicy(supabase, saltAccountId);

  // Use database policy or fall back to default
  const effectivePolicy: SaltPolicy = policy || {
    id: 'default',
    salt_account_id: saltAccountId,
    max_leverage: defaultPolicy.maxLeverage,
    max_daily_notional_usd: defaultPolicy.maxDailyNotionalUsd,
    allowed_pairs: defaultPolicy.allowedPairs,
    max_drawdown_pct: defaultPolicy.maxDrawdownPct,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const todayNotional = await getTodayNotional(supabase, saltAccountAddress);
  const estimatedNotional = params.stakeUsd * params.leverage;

  // Build a computed payload structure for policy validation
  const computedPayload = {
    longAssets: params.longAssets,
    shortAssets: params.shortAssets,
    leverage: params.leverage,
    estimatedNotional,
  };

  const policyValidation = validateTradeAgainstPolicy(
    effectivePolicy,
    computedPayload,
    todayNotional
  );

  if (!policyValidation.allowed) {
    return {
      success: false,
      error: `Policy violation: ${policyValidation.violations.join(', ')}`,
      policyValidation,
    };
  }

  // Log warnings if any
  if (policyValidation.warnings.length > 0) {
    console.log('[StrategyExecutor] Policy warnings:', policyValidation.warnings);
  }

  // 4. Execute via pear-service
  try {
    const trade = await executePairTrade({
      userWalletAddress,
      longAssets: params.longAssets,
      shortAssets: params.shortAssets,
      stakeUsd: params.stakeUsd,
      leverage: params.leverage,
      slippage: params.slippage,
      accountRef: saltAccountAddress,
      source: 'salt',
    });

    console.log('[StrategyExecutor] Direct pair trade executed successfully:', trade.id);

    return {
      success: true,
      trade,
      policyValidation,
    };
  } catch (err) {
    console.error('[StrategyExecutor] Direct pair trade execution failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during trade execution',
      policyValidation,
    };
  }
}
