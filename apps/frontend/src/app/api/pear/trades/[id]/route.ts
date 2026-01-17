import { NextRequest, NextResponse } from 'next/server';
import { getTradeById } from '@/lib/api-server/domain/tradeRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const trade = await getTradeById(supabase, id);

    if (!trade) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Trade not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trade });
  } catch (err: any) {
    console.error('Failed to get trade:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get trade' } },
      { status: 500 }
    );
  }
}
