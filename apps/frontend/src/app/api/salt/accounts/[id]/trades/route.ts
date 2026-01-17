import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById } from '@/lib/api-server/domain/saltRepo';
import { getTradesByAccountRef } from '@/lib/api-server/domain/tradeRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // Verify account exists
    const account = await getSaltAccountById(supabase, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salt account not found' } },
        { status: 404 }
      );
    }

    const trades = await getTradesByAccountRef(supabase, account.salt_account_address);
    return NextResponse.json({ success: true, data: trades });
  } catch (err: any) {
    console.error('Failed to get trades:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get trades' } },
      { status: 500 }
    );
  }
}
