import { NextRequest, NextResponse } from 'next/server';
import { calculateNarrativePerformance, calculateSingleAssetPerformance } from '@/lib/api-server/clients/coingeckoClient';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const long = searchParams.get('long');
  const short = searchParams.get('short');
  const daysStr = searchParams.get('days');
  const days = parseInt(daysStr || '180', 10);

  // Allow single-sided strategies (long-only or short-only)
  if (!long && !short) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'At least one asset (long or short) is required' } },
      { status: 400 }
    );
  }

  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Days must be between 1 and 365' } },
      { status: 400 }
    );
  }

  // Strip any prefix (e.g., "flx:GOLD" -> "GOLD", "xyz:GOOGL" -> "GOOGL")
  const stripPrefix = (symbol: string) => {
    const parts = symbol.split(':');
    return parts[parts.length - 1].toUpperCase();
  };

  const longAsset = long ? stripPrefix(long) : null;
  const shortAsset = short ? stripPrefix(short) : null;

  try {
    let performance;

    if (longAsset && shortAsset) {
      // Long vs Short pair trade
      performance = await calculateNarrativePerformance(
        `custom-${longAsset}-${shortAsset}`,
        longAsset,
        shortAsset,
        days
      );
    } else {
      // Single-sided strategy (long-only or short-only)
      const asset = longAsset || shortAsset!;
      const isLong = !!longAsset;
      performance = await calculateSingleAssetPerformance(
        `custom-${isLong ? 'long' : 'short'}-${asset}`,
        asset,
        isLong,
        days
      );
    }

    return NextResponse.json({ success: true, data: performance });
  } catch (err: any) {
    const asset = longAsset && shortAsset ? `${longAsset} vs ${shortAsset}` : (longAsset || shortAsset);
    console.error(`Failed to calculate performance for ${asset}:`, err);
    const message = err?.message || 'Failed to fetch historical performance data';

    // If it's a token not found error, return 400
    if (message.includes('not found on CoinGecko') || message.includes('Unknown')) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
