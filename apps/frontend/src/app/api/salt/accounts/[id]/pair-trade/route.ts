import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountWithUser, getLatestPolicy } from '@/lib/api-server/domain/saltRepo';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getAgentWallet } from '@/lib/api-server/clients/pearAuthClient';
import { openPosition } from '@/lib/api-server/clients/pearClient';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { createTrade, updateTrade } from '@/lib/api-server/domain/tradeRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import type { Json, SaltPolicy, ValidateTradeResponse } from '@tago-leap/shared/types';

// Hyperliquid minimum notional per position (USD)
const MIN_NOTIONAL_PER_POSITION = 10;

interface HyperliquidAssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  price: number;
  minSize: number; // Calculated minimum size in asset units
}

interface AssetContext {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
  impactPxs: string[];
}

// Cache for asset info (refresh every 5 minutes)
let assetInfoCache: Map<string, HyperliquidAssetInfo> | null = null;
let assetInfoCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getHyperliquidAssetInfo(): Promise<Map<string, HyperliquidAssetInfo>> {
  const now = Date.now();
  if (assetInfoCache && now - assetInfoCacheTime < CACHE_DURATION) {
    return assetInfoCache;
  }

  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const [meta, assetCtxs] = await response.json() as [{ universe: Array<{ name: string; szDecimals: number; maxLeverage: number }> }, AssetContext[]];

    const assetMap = new Map<string, HyperliquidAssetInfo>();

    for (let i = 0; i < meta.universe.length; i++) {
      const asset = meta.universe[i];
      const ctx = assetCtxs[i];
      const price = parseFloat(ctx?.markPx || ctx?.oraclePx || '0');

      // Calculate minimum size based on $10 minimum notional
      const minSize = price > 0 ? MIN_NOTIONAL_PER_POSITION / price : 0;

      assetMap.set(asset.name, {
        name: asset.name,
        szDecimals: asset.szDecimals,
        maxLeverage: asset.maxLeverage,
        price,
        minSize,
      });
    }

    assetInfoCache = assetMap;
    assetInfoCacheTime = now;
    return assetMap;
  } catch (err) {
    console.error('Failed to fetch Hyperliquid asset info:', err);
    // Return empty map if fetch fails - validation will be skipped
    return new Map();
  }
}

interface MinSizeValidation {
  valid: boolean;
  errors: string[];
  assetDetails: Array<{
    asset: string;
    allocatedUsd: number;
    minRequiredUsd: number;
    price: number;
  }>;
}

function validateMinimumSizes(
  longAssets: Array<{ asset: string; weight: number }>,
  shortAssets: Array<{ asset: string; weight: number }>,
  stakeUsd: number,
  leverage: number,
  assetInfo: Map<string, HyperliquidAssetInfo>
): MinSizeValidation {
  const errors: string[] = [];
  const assetDetails: MinSizeValidation['assetDetails'] = [];
  const notional = stakeUsd * leverage;

  // Check each long asset
  for (const asset of longAssets) {
    const info = assetInfo.get(asset.asset);
    if (!info) continue; // Skip unknown assets

    const allocatedUsd = notional * asset.weight;
    const minRequiredUsd = MIN_NOTIONAL_PER_POSITION;

    assetDetails.push({
      asset: asset.asset,
      allocatedUsd,
      minRequiredUsd,
      price: info.price,
    });

    if (allocatedUsd < minRequiredUsd) {
      errors.push(`${asset.asset} position too small: $${allocatedUsd.toFixed(2)} (min $${minRequiredUsd})`);
    }
  }

  // Check each short asset
  for (const asset of shortAssets) {
    const info = assetInfo.get(asset.asset);
    if (!info) continue;

    const allocatedUsd = notional * asset.weight;
    const minRequiredUsd = MIN_NOTIONAL_PER_POSITION;

    assetDetails.push({
      asset: asset.asset,
      allocatedUsd,
      minRequiredUsd,
      price: info.price,
    });

    if (allocatedUsd < minRequiredUsd) {
      errors.push(`${asset.asset} position too small: $${allocatedUsd.toFixed(2)} (min $${minRequiredUsd})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    assetDetails,
  };
}

// Policy validation
interface PolicyValidationResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

async function getTodayNotional(supabase: any, saltAccountAddress: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data, error } = await supabase
    .from('trades')
    .select('stake_usd, pear_order_payload')
    .eq('account_ref', saltAccountAddress)
    .eq('status', 'completed')
    .gte('created_at', todayIso);

  if (error) {
    throw new Error(`Failed to get today's notional: ${error.message}`);
  }

  let totalNotional = 0;
  for (const trade of data || []) {
    const stakeUsd = trade.stake_usd || 0;
    const payload = trade.pear_order_payload as { leverage?: number } | null;
    const leverage = payload?.leverage || 1;
    totalNotional += stakeUsd * leverage;
  }

  return totalNotional;
}

function validateTradeAgainstPolicy(
  policy: SaltPolicy,
  computedPayload: NonNullable<ValidateTradeResponse['computedPayload']>,
  todayNotional: number
): PolicyValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  const maxLeverage = policy.max_leverage ?? 10;
  const maxDailyNotionalUsd = policy.max_daily_notional_usd ?? 1000000;

  if (computedPayload.leverage > maxLeverage) {
    violations.push(
      `Leverage ${computedPayload.leverage}x exceeds policy maximum of ${maxLeverage}x`
    );
  }

  const projectedNotional = todayNotional + computedPayload.estimatedNotional;
  if (projectedNotional > maxDailyNotionalUsd) {
    violations.push(
      `Projected daily notional $${projectedNotional.toFixed(2)} exceeds policy limit of $${maxDailyNotionalUsd}`
    );
  }

  const allowedPairs = policy.allowed_pairs as string[] | null;
  if (allowedPairs && allowedPairs.length > 0) {
    const allAssets = [
      ...computedPayload.longAssets.map(a => a.asset),
      ...computedPayload.shortAssets.map(a => a.asset),
    ];

    for (const asset of allAssets) {
      const isAllowed = allowedPairs.some(pair => {
        const baseAsset = pair.split('-')[0];
        return baseAsset === asset || pair === asset;
      });

      if (!isAllowed) {
        violations.push(`Asset ${asset} is not in allowed pairs`);
      }
    }
  }

  return { allowed: violations.length === 0, violations, warnings };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { longAssets, shortAssets, stakeUsd, leverage, slippage = 0.01 } = await request.json();

    // Validation
    if (!longAssets || !shortAssets || !stakeUsd || !leverage) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields: longAssets, shortAssets, stakeUsd, leverage' } },
        { status: 400 }
      );
    }

    // Allow directional trades (one side can be empty)
    if ((!Array.isArray(longAssets) || longAssets.length === 0) &&
        (!Array.isArray(shortAssets) || shortAssets.length === 0)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Need at least one asset (long or short)' } },
        { status: 400 }
      );
    }

    if (stakeUsd < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Minimum stake is $1 USD' } },
        { status: 400 }
      );
    }

    if (leverage < 1 || leverage > 20) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Leverage must be between 1 and 20' } },
        { status: 400 }
      );
    }

    const notional = stakeUsd * leverage;
    if (notional < 10) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: `Minimum notional is $10. Your trade is $${notional.toFixed(2)}` } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get account with user wallet
    const account = await getSaltAccountWithUser(supabase, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salt account not found' } },
        { status: 404 }
      );
    }

    const userWalletAddress = account.users.wallet_address;

    // Get access token
    const accessToken = await getValidAccessToken(supabase, userWalletAddress);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated with Pear Protocol' } },
        { status: 401 }
      );
    }

    // Check agent wallet
    try {
      const agentWalletStatus = await getAgentWallet(accessToken);
      if (!agentWalletStatus.exists) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Agent wallet not set up' } },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('Failed to check agent wallet:', err);
    }

    // Get policy and validate
    const policy = await getLatestPolicy(supabase, id);
    if (policy) {
      const todayNotional = await getTodayNotional(supabase, account.salt_account_address);
      const computedPayload = {
        longAssets: longAssets || [],
        shortAssets: shortAssets || [],
        leverage,
        estimatedNotional: notional,
      };

      const validation = validateTradeAgainstPolicy(policy, computedPayload, todayNotional);

      if (!validation.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'POLICY_VIOLATION', message: `Policy violation: ${validation.violations.join(', ')}` },
            data: { success: false, error: `Policy violation: ${validation.violations.join(', ')}` },
          },
          { status: 400 }
        );
      }

      // Check drawdown limit if policy has max_drawdown_pct set
      if (policy.max_drawdown_pct && (account as any).current_drawdown_pct >= policy.max_drawdown_pct) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DRAWDOWN_LIMIT',
              message: `Account drawdown ${((account as any).current_drawdown_pct || 0).toFixed(1)}% exceeds policy limit of ${policy.max_drawdown_pct}%`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate minimum position sizes against Hyperliquid requirements
    const assetInfo = await getHyperliquidAssetInfo();
    if (assetInfo.size > 0) {
      const sizeValidation = validateMinimumSizes(
        longAssets || [],
        shortAssets || [],
        stakeUsd,
        leverage,
        assetInfo
      );

      if (!sizeValidation.valid) {
        const minRequired = sizeValidation.assetDetails
          .filter(d => d.allocatedUsd < d.minRequiredUsd)
          .map(d => `${d.asset}: need $${d.minRequiredUsd}, got $${d.allocatedUsd.toFixed(2)}`)
          .join('; ');

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MIN_SIZE_ERROR',
              message: `Position size too small. Each asset needs at least $${MIN_NOTIONAL_PER_POSITION}. ${minRequired}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Get or create user
    const user = await getOrCreateUser(supabase, userWalletAddress);

    // Build order payload
    const orderPayload = {
      slippage,
      executionType: 'MARKET' as const,
      leverage,
      usdValue: stakeUsd,
      longAssets: (longAssets || []).map((a: any) => ({ asset: a.asset, weight: a.weight })),
      shortAssets: (shortAssets || []).map((a: any) => ({ asset: a.asset, weight: a.weight })),
    };

    // Create trade record
    const trade = await createTrade(supabase, user.id, {
      narrative_id: 'custom',
      direction: 'long',
      stake_usd: stakeUsd,
      risk_profile: 'moderate',
      mode: 'live',
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
      source: 'salt',
      account_ref: account.salt_account_address,
    });

    try {
      const pearResponse = await openPosition(accessToken, orderPayload);
      const isSuccess = pearResponse.fills && pearResponse.fills.length > 0;

      const updatedTrade = await updateTrade(supabase, trade.id, {
        status: isSuccess ? 'completed' : 'failed',
        pear_response: pearResponse as unknown as Json,
      });

      return NextResponse.json({
        success: true,
        data: { success: true, trade: updatedTrade },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await updateTrade(supabase, trade.id, {
        status: 'failed',
        pear_response: { error: errorMessage },
      });

      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage } },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Pair trade execution failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to execute pair trade' } },
      { status: 500 }
    );
  }
}
