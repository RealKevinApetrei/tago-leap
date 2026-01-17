import { NextRequest, NextResponse } from 'next/server';
import { logout as pearLogout } from '@/lib/api-server/clients/pearAuthClient';
import { getAuthTokens, deleteAuthTokens } from '@/lib/api-server/domain/authRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

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

    // Try to logout from Pear (invalidate refresh token)
    const tokens = await getAuthTokens(supabase, walletAddress);
    if (tokens?.refresh_token) {
      await pearLogout(tokens.refresh_token);
    }

    // Delete from our database
    await deleteAuthTokens(supabase, walletAddress);

    return NextResponse.json({ success: true, data: { loggedOut: true } });
  } catch (err) {
    console.error('Logout failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Logout failed' } },
      { status: 500 }
    );
  }
}
