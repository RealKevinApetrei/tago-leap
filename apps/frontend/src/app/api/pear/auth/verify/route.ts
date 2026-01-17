import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-server/clients/pearAuthClient';
import { saveAuthTokens } from '@/lib/api-server/domain/authRepo';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, timestamp } = await request.json();

    if (!walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields: walletAddress, signature, timestamp' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get or create user first
    const user = await getOrCreateUser(supabase, walletAddress);

    // Authenticate with Pear Protocol
    const tokens = await authenticate(walletAddress, signature, timestamp);

    // Save tokens to database
    await saveAuthTokens(supabase, user.id, walletAddress, tokens);

    return NextResponse.json({ success: true, data: { authenticated: true } });
  } catch (err) {
    console.error('Authentication failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } },
      { status: 401 }
    );
  }
}
