import { NextRequest, NextResponse } from 'next/server';
import { openPosition } from '@/lib/api-server/clients/pearClient';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

interface CloseByAssetRequest {
  walletAddress: string;
  asset: string;
  size: number;      // Absolute position size
  isLong: boolean;   // Whether the position is long (to close, we short)
  leverage: number;
}

/**
 * POST /api/pear/positions/close-by-asset
 * Closes a position by placing an opposite order for the specified asset
 */
export async function POST(request: NextRequest) {
  try {
    const body: CloseByAssetRequest = await request.json();
    const { walletAddress, asset, size, isLong, leverage } = body;

    if (!walletAddress || !asset || !size) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    console.log('[close-by-asset] Request:', { walletAddress, asset, size, isLong, leverage });

    const supabase = getSupabaseAdmin();
    const accessToken = await getValidAccessToken(supabase, walletAddress);

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please reconnect your wallet.' } },
        { status: 401 }
      );
    }

    // To close a position, we place an opposite order
    // If we're long, we need to short to close
    // If we're short, we need to long to close
    const closePayload = {
      slippage: 0.05, // 5% slippage for market close
      executionType: 'MARKET' as const,
      leverage: leverage || 1,
      usdValue: size, // Use the position value as the closing size
      longAssets: isLong ? [] : [{ asset, weight: 1 }],  // If short position, go long to close
      shortAssets: isLong ? [{ asset, weight: 1 }] : [], // If long position, go short to close
    };

    console.log('[close-by-asset] Closing with payload:', JSON.stringify(closePayload, null, 2));

    const response = await openPosition(accessToken, closePayload);

    console.log('[close-by-asset] Close response:', response);

    return NextResponse.json({ success: true, data: response });
  } catch (err: any) {
    console.error('[close-by-asset] Error:', err);

    // Check for specific error types
    const errorMessage = err?.message || 'Failed to close position';

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
