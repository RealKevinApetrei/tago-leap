import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { createSaltAccount, getSaltAccountByWalletAddress } from '@/lib/api-server/domain/saltRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userWalletAddress } = await request.json();

    if (!userWalletAddress) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing userWalletAddress' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get or create user
    const user = await getOrCreateUser(supabase, userWalletAddress);

    // Check if account already exists
    let account = await getSaltAccountByWalletAddress(supabase, userWalletAddress);

    if (!account) {
      // Create new salt account
      account = await createSaltAccount(supabase, user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        saltAccountAddress: account.salt_account_address,
        account,
      },
    });
  } catch (err: any) {
    console.error('Failed to create salt account:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to create salt account' } },
      { status: 500 }
    );
  }
}
