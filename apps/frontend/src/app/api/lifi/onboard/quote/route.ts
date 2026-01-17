import { NextRequest, NextResponse } from 'next/server';
import { getRoutes } from '@/lib/api-server/clients/lifiClient';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      userWalletAddress,
      fromChainId,
      fromTokenAddress,
      amount,
      toTokenAddress,
      toChainId,
      depositToSaltWallet,
      preference = 'recommended',
    } = await request.json();

    if (!userWalletAddress || !fromChainId || !fromTokenAddress || !amount || !toTokenAddress) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get or create user
    await getOrCreateUser(supabase, userWalletAddress);

    // Determine destination address
    let toAddress = userWalletAddress;
    let saltWalletAddress: string | undefined;

    if (depositToSaltWallet) {
      // Get salt wallet address
      const { data: saltAccount } = await supabase
        .from('salt_accounts')
        .select('salt_account_address, users!inner(wallet_address)')
        .eq('users.wallet_address', userWalletAddress.toLowerCase())
        .single();

      if (saltAccount) {
        saltWalletAddress = saltAccount.salt_account_address;
        toAddress = saltWalletAddress;
      }
    }

    // Get routes from LI.FI
    // Always bridge to Arbitrum (42161) since Hyperliquid Bridge2 is on Arbitrum
    // The frontend then deposits to Hyperliquid via the Bridge2 contract
    const ARBITRUM_CHAIN_ID = 42161;
    const destinationChainId = toChainId || ARBITRUM_CHAIN_ID;

    const routeAlternatives = await getRoutes({
      fromChainId,
      toChainId: destinationChainId,
      fromTokenAddress,
      toTokenAddress,
      fromAmount: amount,
      fromAddress: userWalletAddress,
      toAddress,
      preference,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `flow_${Date.now()}`,
        status: 'initiated',
        recommended: routeAlternatives.recommended,
        alternatives: routeAlternatives.alternatives,
        preference: routeAlternatives.preference,
        routeCount: routeAlternatives.routeCount,
        saltWalletAddress,
        // Raw LI.FI route for frontend SDK execution
        rawRoute: routeAlternatives.recommended?.raw || null,
      },
    });
  } catch (err: any) {
    console.error('Failed to get quote:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get quote' } },
      { status: 500 }
    );
  }
}
