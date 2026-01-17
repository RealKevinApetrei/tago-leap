import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokens } from '@/lib/api-server/domain/authRepo';
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
  const tokens = await getAuthTokens(supabase, wallet);

  if (!tokens) {
    return NextResponse.json({ success: true, data: { authenticated: false } });
  }

  const expiresAt = new Date(tokens.access_token_expires_at);
  const isExpired = new Date() >= expiresAt;

  return NextResponse.json({
    success: true,
    data: {
      authenticated: !isExpired,
      expiresAt: tokens.access_token_expires_at,
    },
  });
}
