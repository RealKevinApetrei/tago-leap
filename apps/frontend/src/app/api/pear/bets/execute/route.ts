import { NextRequest, NextResponse } from 'next/server';
import { openPosition } from '@/lib/api-server/clients/pearClient';
import { getAgentWallet } from '@/lib/api-server/clients/pearAuthClient';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { createTrade, updateTrade } from '@/lib/api-server/domain/tradeRepo';
import { verifySaltAccountOwnership } from '@/lib/api-server/domain/saltAccountRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import type { Json } from '@tago-leap/shared/types';

export async function POST(request: NextRequest) {
  try {
    const {
      userWalletAddress,
      longAssets,
      shortAssets,
      stakeUsd,
      leverage,
      slippage = 0.01,
      accountRef,
      source = 'user',
    } = await request.json();

    // Validate required fields
    if (!userWalletAddress || !stakeUsd || !leverage) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields: userWalletAddress, stakeUsd, leverage' } },
        { status: 400 }
      );
    }

    const longAssetsList = longAssets || [];
    const shortAssetsList = shortAssets || [];

    if (longAssetsList.length === 0 && shortAssetsList.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Need at least one asset (long or short) to execute trade' } },
        { status: 400 }
      );
    }

    if (stakeUsd < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Minimum stake is $1 USD' } },
        { status: 400 }
      );
    }

    if (leverage < 1 || leverage > 100) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Leverage must be between 1 and 100' } },
        { status: 400 }
      );
    }

    // Hyperliquid requires minimum $10 notional per position
    const notional = stakeUsd * leverage;
    const totalAssets = longAssetsList.length + shortAssetsList.length;
    const minNotionalPerAsset = 10;
    const minTotalNotional = Math.max(10, totalAssets * minNotionalPerAsset);

    if (notional < minTotalNotional) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Minimum notional not met. Hyperliquid requires ~$10 per position. With ${totalAssets} assets, you need at least $${minTotalNotional} total notional. Your trade: $${notional.toFixed(2)} (${stakeUsd} × ${leverage}x).`
          }
        },
        { status: 400 }
      );
    }

    if (source === 'salt' && !accountRef) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'accountRef is required when source is "salt"' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify Salt account ownership if applicable
    if (source === 'salt' && accountRef) {
      const isOwner = await verifySaltAccountOwnership(supabase, accountRef, userWalletAddress);
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'User does not own this Salt account' } },
          { status: 403 }
        );
      }
    }

    const user = await getOrCreateUser(supabase, userWalletAddress);

    const accessToken = await getValidAccessToken(supabase, userWalletAddress);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in first.' } },
        { status: 401 }
      );
    }

    // Check agent wallet is set up
    try {
      const agentWalletStatus = await getAgentWallet(accessToken);
      if (!agentWalletStatus.exists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Agent wallet not set up. Please create an agent wallet and approve it on Hyperliquid first.'
            }
          },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('Failed to check agent wallet status:', err);
    }

    const orderPayload = {
      slippage,
      executionType: 'MARKET' as const,
      leverage,
      usdValue: stakeUsd,
      longAssets: longAssetsList.map((a: any) => ({ asset: a.asset, weight: a.weight })),
      shortAssets: shortAssetsList.map((a: any) => ({ asset: a.asset, weight: a.weight })),
    };

    const trade = await createTrade(supabase, user.id, {
      narrative_id: 'custom',
      direction: 'long',
      stake_usd: stakeUsd,
      risk_profile: 'moderate',
      mode: 'live',
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
      source,
      account_ref: accountRef ?? null,
    });

    try {
      console.log('Executing trade via Pear API:', { tradeId: trade.id, orderPayload });

      const pearResponse = await openPosition(accessToken, orderPayload);
      const isSuccess = pearResponse.fills && pearResponse.fills.length > 0;

      console.log(isSuccess ? 'Trade executed successfully' : 'Trade executed but no fills', {
        tradeId: trade.id,
        fillCount: pearResponse.fills?.length || 0,
      });

      const updatedTrade = await updateTrade(supabase, trade.id, {
        status: isSuccess ? 'completed' : 'failed',
        pear_response: pearResponse as unknown as Json,
      });

      return NextResponse.json({ success: true, data: updatedTrade });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Trade execution failed:', { tradeId: trade.id, error: errorMessage });

      await updateTrade(supabase, trade.id, {
        status: 'failed',
        pear_response: { error: errorMessage },
      });

      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage || 'Trade execution failed' } },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Trade execution failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Trade execution failed' } },
      { status: 500 }
    );
  }
}
