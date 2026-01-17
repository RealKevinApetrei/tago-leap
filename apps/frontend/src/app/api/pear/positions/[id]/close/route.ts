import { NextRequest, NextResponse } from 'next/server';
import { closePosition } from '@/lib/api-server/clients/pearClient';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const response = await closePosition(accessToken, id);
    return NextResponse.json({ success: true, data: response });
  } catch (err: any) {
    console.error('Failed to close position:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: `Failed to close position: ${err?.message}` } },
      { status: 500 }
    );
  }
}
