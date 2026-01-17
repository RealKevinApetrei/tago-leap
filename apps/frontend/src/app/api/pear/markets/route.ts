import { NextRequest, NextResponse } from 'next/server';
import { getMarkets } from '@/lib/api-server/clients/pearClient';

export async function GET(request: NextRequest) {
  try {
    const markets = await getMarkets();
    return NextResponse.json({ success: true, data: markets });
  } catch (err) {
    console.error('Failed to get markets:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get markets' } },
      { status: 500 }
    );
  }
}
