import { NextRequest, NextResponse } from 'next/server';
import { fetchUserLists } from '@/lib/api-server/clients/twitterClient';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

/**
 * GET /api/twitter/lists
 * Fetches user's Twitter lists
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

    // Get user's access token
    const { data: tokenData, error } = await supabase
      .from('x_tokens')
      .select('access_token, expires_at')
      .eq('user_wallet', walletAddress.toLowerCase())
      .single();

    if (error || !tokenData) {
      return NextResponse.json(
        { error: 'X account not connected', lists: [] },
        { status: 401 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt <= new Date()) {
      return NextResponse.json(
        { error: 'X token expired, please reconnect', lists: [] },
        { status: 401 }
      );
    }

    // Fetch user's lists
    const lists = await fetchUserLists(tokenData.access_token);

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('[twitter/lists] Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Twitter lists', lists: [] },
      { status: 500 }
    );
  }
}
