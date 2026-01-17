import { NextRequest, NextResponse } from 'next/server';
import { getAgentWallet, createAgentWallet } from '@/lib/api-server/clients/pearAuthClient';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing wallet query parameter' } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const accessToken = await getValidAccessToken(supabase, wallet);

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated with Pear Protocol' } },
      { status: 401 }
    );
  }

  try {
    const status = await getAgentWallet(accessToken);
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    console.error('Failed to get agent wallet status:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent wallet status' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing walletAddress' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const accessToken = await getValidAccessToken(supabase, walletAddress);

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated with Pear Protocol' } },
        { status: 401 }
      );
    }

    try {
      const result = await createAgentWallet(accessToken);
      return NextResponse.json({ success: true, data: result });
    } catch (err: any) {
      console.error('Failed to create agent wallet:', err);
      return NextResponse.json({
        success: false,
        error: { code: 'AGENT_WALLET_ERROR', message: err?.message || 'Failed to create agent wallet' },
      });
    }
  } catch (err) {
    console.error('Failed to create agent wallet:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create agent wallet' } },
      { status: 500 }
    );
  }
}
