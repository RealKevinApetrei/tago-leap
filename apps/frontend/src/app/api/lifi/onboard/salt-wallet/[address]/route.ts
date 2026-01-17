import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/api-server/domain/userRepo';
import { createSaltAccount, getSaltAccountByWalletAddress } from '@/lib/api-server/domain/saltRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing wallet address' } },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get or create user
    const user = await getOrCreateUser(supabase, address);

    // Check if salt account exists
    let saltAccount = await getSaltAccountByWalletAddress(supabase, address);

    if (!saltAccount) {
      // Create new salt account
      saltAccount = await createSaltAccount(supabase, user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        userWalletAddress: address,
        saltWalletAddress: saltAccount.salt_account_address,
        exists: true,
      },
    });
  } catch (err: any) {
    console.error('Failed to get salt wallet:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get salt wallet' } },
      { status: 500 }
    );
  }
}
