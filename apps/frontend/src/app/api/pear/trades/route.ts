import { NextRequest, NextResponse } from 'next/server';
import { getTradesWithFilters, getTradesByAccountRef } from '@/lib/api-server/domain/tradeRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import type { TradeFilters, TradeSource } from '@tago-leap/shared/types';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  const accountRef = request.nextUrl.searchParams.get('accountRef');
  const source = request.nextUrl.searchParams.get('source') as TradeSource | null;
  const status = request.nextUrl.searchParams.get('status');

  if (!wallet && !accountRef) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Either wallet or accountRef query parameter is required' } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // If only accountRef is provided, use the optimized query
    if (accountRef && !wallet) {
      const trades = await getTradesByAccountRef(supabase, accountRef);
      return NextResponse.json({ success: true, data: trades });
    }

    // Use flexible filters
    const filters: TradeFilters = {
      walletAddress: wallet || undefined,
      accountRef: accountRef || undefined,
      source: source || undefined,
      status: status || undefined,
    };

    const trades = await getTradesWithFilters(supabase, filters);
    return NextResponse.json({ success: true, data: trades });
  } catch (err: any) {
    console.error('Failed to get trades:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get trades' } },
      { status: 500 }
    );
  }
}
