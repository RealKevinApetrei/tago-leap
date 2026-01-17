import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserInfo } from '@/lib/api-server/clients/twitterClient';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

/**
 * GET /api/twitter/auth/callback
 * Handles Twitter OAuth 2.0 callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('[twitter/callback] OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/robo?tab=trade&x_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/robo?tab=trade&x_error=missing_params', request.url)
    );
  }

  // Get code verifier from cookie or header
  const codeVerifier = request.cookies.get('x_code_verifier')?.value;

  if (!codeVerifier) {
    console.error('[twitter/callback] Missing code verifier');
    return NextResponse.redirect(
      new URL('/robo?tab=trade&x_error=missing_verifier', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // Get user info
    const userInfo = await getUserInfo(tokens.accessToken);

    // Get wallet address from state or session
    const walletAddress = request.cookies.get('x_wallet')?.value;

    if (!walletAddress) {
      console.error('[twitter/callback] Missing wallet address');
      return NextResponse.redirect(
        new URL('/robo?tab=trade&x_error=missing_wallet', request.url)
      );
    }

    // Store tokens in Supabase
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await supabase.from('x_tokens').upsert(
      {
        user_wallet: walletAddress.toLowerCase(),
        x_user_id: userInfo.id,
        x_username: userInfo.username,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_wallet' }
    );

    // Clear cookies and redirect to success
    const response = NextResponse.redirect(
      new URL('/robo?tab=trade&x_connected=true', request.url)
    );

    response.cookies.delete('x_code_verifier');
    response.cookies.delete('x_wallet');
    response.cookies.delete('x_state');

    return response;
  } catch (error) {
    console.error('[twitter/callback] Error exchanging code:', error);
    return NextResponse.redirect(
      new URL('/robo?tab=trade&x_error=token_exchange_failed', request.url)
    );
  }
}
