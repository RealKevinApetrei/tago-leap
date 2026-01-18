import { NextRequest, NextResponse } from 'next/server';
import {
  calculateRatioPerformance,
  calculatePairPerformance,
  calculateSingleAssetPerformance,
  getAvailableAssets,
} from '@/lib/api-server/clients/hyperliquidClient';
import {
  calculateNarrativePerformance as cgCalculateNarrativePerformance,
  calculateSingleAssetPerformance as cgCalculateSingleAssetPerformance,
} from '@/lib/api-server/clients/coingeckoClient';

/**
 * Performance API - Calculates historical ratio performance for pair/basket trades
 *
 * Primary: Uses Hyperliquid candle data (same price source as Pear trades)
 * Fallback: CoinGecko for assets not on Hyperliquid
 *
 * Query params:
 * - long: Single asset OR comma-separated for basket (e.g., "BTC" or "BTC,ETH")
 * - short: Single asset OR comma-separated for basket
 * - longWeights: Optional comma-separated weights (e.g., "0.6,0.4")
 * - shortWeights: Optional comma-separated weights
 * - days: Number of days of history (default: 30, max: 365)
 *
 * POST body (for complex baskets):
 * {
 *   longAssets: [{ asset: "BTC", weight: 0.5 }, { asset: "ETH", weight: 0.5 }],
 *   shortAssets: [{ asset: "SOL", weight: 1 }],
 *   days: 30
 * }
 */

interface AssetWithWeight {
  asset: string;
  weight: number;
}

// Cache for Hyperliquid available assets
let hlAssetsCache: { assets: Set<string>; expiry: number } | null = null;
const HL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getHLAssets(): Promise<Set<string>> {
  if (hlAssetsCache && hlAssetsCache.expiry > Date.now()) {
    return hlAssetsCache.assets;
  }

  try {
    const assets = await getAvailableAssets();
    hlAssetsCache = {
      assets: new Set(assets.map(a => a.toUpperCase())),
      expiry: Date.now() + HL_CACHE_TTL,
    };
    return hlAssetsCache.assets;
  } catch (err) {
    console.error('[Performance API] Failed to fetch HL assets:', err);
    return new Set();
  }
}

function parseAssets(
  assetStr: string | null,
  weightsStr: string | null
): AssetWithWeight[] {
  if (!assetStr) return [];

  const assets = assetStr.split(',').map(a => a.trim().toUpperCase());
  let weights: number[];

  if (weightsStr) {
    weights = weightsStr.split(',').map(w => parseFloat(w.trim()));
    // Validate weights sum to 1 (approximately)
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) {
      // Normalize weights
      weights = weights.map(w => w / sum);
    }
  } else {
    // Equal weights if not specified
    weights = assets.map(() => 1 / assets.length);
  }

  return assets.map((asset, i) => ({
    asset: stripPrefix(asset),
    weight: weights[i] || 1 / assets.length,
  }));
}

// Strip any prefix (e.g., "flx:GOLD" -> "GOLD", "xyz:GOOGL" -> "GOOGL")
function stripPrefix(symbol: string): string {
  const parts = symbol.split(':');
  return parts[parts.length - 1].toUpperCase();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const long = searchParams.get('long');
  const short = searchParams.get('short');
  const longWeights = searchParams.get('longWeights');
  const shortWeights = searchParams.get('shortWeights');
  const daysStr = searchParams.get('days');
  const days = parseInt(daysStr || '30', 10);

  // At least one side is required
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

  const longAssets = parseAssets(long, longWeights);
  const shortAssets = parseAssets(short, shortWeights);

  return calculatePerformance(longAssets, shortAssets, days);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { longAssets, shortAssets, days = 30 } = body;

    // Ensure assets are arrays
    if (!Array.isArray(longAssets)) {
      longAssets = [];
    }
    if (!Array.isArray(shortAssets)) {
      shortAssets = [];
    }

    // Validate and normalize assets
    const normalizedLong: AssetWithWeight[] = longAssets
      .filter((a: any) => a && (typeof a === 'string' || a.asset))
      .map((a: any) => ({
        asset: stripPrefix(typeof a === 'string' ? a : a.asset),
        weight: typeof a === 'object' && a.weight ? a.weight : 1 / Math.max(longAssets.length, 1),
      }));

    const normalizedShort: AssetWithWeight[] = shortAssets
      .filter((a: any) => a && (typeof a === 'string' || a.asset))
      .map((a: any) => ({
        asset: stripPrefix(typeof a === 'string' ? a : a.asset),
        weight: typeof a === 'object' && a.weight ? a.weight : 1 / Math.max(shortAssets.length, 1),
      }));

    if (normalizedLong.length === 0 && normalizedShort.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'At least one asset is required' } },
        { status: 400 }
      );
    }

    return calculatePerformance(normalizedLong, normalizedShort, days);
  } catch (err: any) {
    console.error('[Performance API] POST error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: err?.message || 'Invalid request body' } },
      { status: 400 }
    );
  }
}

async function calculatePerformance(
  longAssets: AssetWithWeight[],
  shortAssets: AssetWithWeight[],
  days: number
) {
  try {
    // Check which assets are available on Hyperliquid
    const hlAssets = await getHLAssets();
    const allAssets = [...longAssets, ...shortAssets];
    const allOnHL = allAssets.every(a => hlAssets.has(a.asset));

    let performance;

    if (allOnHL && (longAssets.length > 0 && shortAssets.length > 0)) {
      // All assets on Hyperliquid - use weighted ratio calculation
      console.log('[Performance API] Using Hyperliquid for ratio calculation');
      performance = await calculateRatioPerformance(
        `custom-${longAssets.map(a => a.asset).join('+')}-vs-${shortAssets.map(a => a.asset).join('+')}`,
        longAssets,
        shortAssets,
        days
      );
    } else if (allOnHL && longAssets.length > 0 && shortAssets.length === 0) {
      // Long-only on Hyperliquid
      console.log('[Performance API] Using Hyperliquid for long-only');
      const asset = longAssets[0].asset;
      performance = await calculateSingleAssetPerformance(
        `custom-long-${asset}`,
        asset,
        true,
        days
      );
    } else if (allOnHL && shortAssets.length > 0 && longAssets.length === 0) {
      // Short-only on Hyperliquid
      console.log('[Performance API] Using Hyperliquid for short-only');
      const asset = shortAssets[0].asset;
      performance = await calculateSingleAssetPerformance(
        `custom-short-${asset}`,
        asset,
        false,
        days
      );
    } else {
      // Fall back to CoinGecko for assets not on Hyperliquid
      console.log('[Performance API] Falling back to CoinGecko');

      if (longAssets.length > 0 && shortAssets.length > 0) {
        // Simple pair trade (first asset from each side)
        performance = await cgCalculateNarrativePerformance(
          `custom-${longAssets[0].asset}-${shortAssets[0].asset}`,
          longAssets[0].asset,
          shortAssets[0].asset,
          days
        );
      } else {
        const asset = longAssets[0]?.asset || shortAssets[0]?.asset;
        const isLong = longAssets.length > 0;
        performance = await cgCalculateSingleAssetPerformance(
          `custom-${isLong ? 'long' : 'short'}-${asset}`,
          asset,
          isLong,
          days
        );
      }
    }

    return NextResponse.json({ success: true, data: performance });
  } catch (err: any) {
    const longStr = longAssets.map(a => a.asset).join('+');
    const shortStr = shortAssets.map(a => a.asset).join('+');
    const pairStr = longStr && shortStr ? `${longStr} vs ${shortStr}` : (longStr || shortStr);

    console.error(`[Performance API] Failed to calculate performance for ${pairStr}:`, err);
    const message = err?.message || 'Failed to fetch historical performance data';

    // Check for known error patterns
    if (message.includes('not found') || message.includes('Unknown') || message.includes('No price data')) {
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
