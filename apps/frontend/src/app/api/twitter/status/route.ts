import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

/**
 * GET /api/twitter/status
 * Check if user has connected their X account
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Missing wallet address' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('x_tokens')
      .select('x_user_id, x_username, expires_at')
      .eq('user_wallet', walletAddress.toLowerCase())
      .single();

    if (error || !data) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    const isExpired = expiresAt <= new Date();

    if (isExpired) {
      return NextResponse.json({
        connected: false,
        expired: true,
        account: null,
      });
    }

    return NextResponse.json({
      connected: true,
      account: {
        id: data.x_user_id,
        username: data.x_username,
        avatar: `https://unavatar.io/twitter/${data.x_username}`,
      },
    });
  } catch (error) {
    console.error('[twitter/status] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check X connection status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/twitter/status
 * Disconnect user's X account
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Missing wallet address' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    await supabase
      .from('x_tokens')
      .delete()
      .eq('user_wallet', walletAddress.toLowerCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[twitter/status] Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect X account' },
      { status: 500 }
    );
  }
}
