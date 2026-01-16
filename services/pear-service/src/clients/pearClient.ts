import { env } from '../config/env.js';
import type {
  PearMarket,
  MarketsResponse,
  GetMarketsParams,
  PearPosition,
  OpenPositionPayload,
  OrderResponse,
  ActiveAssetsResponse,
  ActiveAssetGroupItem,
} from '@tago-leap/shared/types';

const PEAR_API_BASE = env.PEAR_API_BASE_URL;

/**
 * Make an authenticated request to the Pear API.
 */
async function pearFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PEAR_API_BASE}${endpoint}`;
  console.log('[pearFetch] Request:', {
    url,
    method: options.method || 'GET',
    hasBody: !!options.body,
  });

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  console.log('[pearFetch] Response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('[pearFetch] Error response:', error);
    throw new Error(`Pear API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Convert ActiveAssetGroupItem to our PearMarket format.
 */
function groupItemToMarket(item: ActiveAssetGroupItem): PearMarket {
  return {
    longAssets: item.longAssets || [],
    shortAssets: item.shortAssets || [],
    volume: item.volume,
    ratio: item.ratio,
    change24h: item.change24h,
    openInterest: item.openInterest,
  };
}

/**
 * Hyperliquid meta response type
 */
interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated?: boolean;
  }>;
}

/**
 * Get available assets from Hyperliquid (which Pear uses for execution).
 * This fetches the full list of tradable perpetual assets.
 */
async function getHyperliquidAssets(): Promise<string[]> {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'meta' }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Hyperliquid assets: ${response.status}`);
  }

  const meta = await response.json() as HyperliquidMeta;
  return meta.universe.map(asset => asset.name);
}

/**
 * Get available markets from Pear Protocol.
 * Uses both the Pear /markets/active endpoint for actively traded pairs
 * and Hyperliquid for the full list of tradable assets.
 */
export async function getMarkets(params?: GetMarketsParams): Promise<MarketsResponse> {
  console.log('[pearClient] Fetching markets from Pear API...');

  // Try to fetch from Pear's /markets/active endpoint first
  try {
    const pearResponse = await fetch(`${PEAR_API_BASE}/markets/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (pearResponse.ok) {
      const rawResponse = await pearResponse.json() as ActiveAssetsResponse;

      console.log('[pearClient] Pear API response keys:', Object.keys(rawResponse));
      console.log('[pearClient] Active markets count:', rawResponse.active?.length || 0);

      // Flatten all market arrays into a single list, deduplicating
      const allGroups: ActiveAssetGroupItem[] = [];
      const seen = new Set<string>();

      const addGroups = (groups: ActiveAssetGroupItem[] | undefined) => {
        if (!Array.isArray(groups)) return;
        for (const group of groups) {
          const longKey = (group.longAssets || []).map(a => a.asset).sort().join(',');
          const shortKey = (group.shortAssets || []).map(a => a.asset).sort().join(',');
          const key = `${longKey}|${shortKey}`;

          if (!seen.has(key) && (group.longAssets?.length > 0 || group.shortAssets?.length > 0)) {
            seen.add(key);
            allGroups.push(group);
          }
        }
      };

      addGroups(rawResponse.active);
      addGroups(rawResponse.topGainers);
      addGroups(rawResponse.topLosers);
      addGroups(rawResponse.highlighted);
      addGroups(rawResponse.watchlist);

      const markets = allGroups.map(groupItemToMarket);

      // Extract unique assets from Pear markets
      const uniqueAssets = new Set<string>();
      for (const market of markets) {
        for (const asset of market.longAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
        for (const asset of market.shortAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
      }

      console.log(`[pearClient] Found ${markets.length} markets with ${uniqueAssets.size} unique assets from Pear`);

      // If Pear returned enough assets, use them
      if (uniqueAssets.size >= 50) {
        return { markets, raw: rawResponse };
      }

      // Otherwise, supplement with Hyperliquid assets
      console.log('[pearClient] Supplementing with Hyperliquid assets...');
    }
  } catch (err) {
    console.log('[pearClient] Pear API failed, falling back to Hyperliquid:', err);
  }

  // Fallback: fetch from Hyperliquid
  console.log('[pearClient] Fetching available assets from Hyperliquid...');
  const assets = await getHyperliquidAssets();

  console.log(`[pearClient] Found ${assets.length} tradable assets on Hyperliquid`);

  // Create a market entry for each asset (any asset can be long or short on Pear)
  const markets: PearMarket[] = assets.map(asset => ({
    longAssets: [{ asset, weight: 1 }],
    shortAssets: [{ asset, weight: 1 }],
    volume: '0',
    openInterest: '0',
  }));

  console.log('[pearClient] Sample assets:', assets.slice(0, 20).join(', '));

  return { markets };
}

/**
 * Get a single market by ID.
 */
export async function getMarketById(marketId: string): Promise<PearMarket | null> {
  try {
    const response = await fetch(`${PEAR_API_BASE}/markets/${marketId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch market: ${await response.text()}`);
    }

    return response.json() as Promise<PearMarket>;
  } catch {
    return null;
  }
}

/**
 * Open a new position on Pear Protocol.
 * Requires authentication.
 */
export async function openPosition(
  accessToken: string,
  payload: OpenPositionPayload
): Promise<OrderResponse> {
  console.log('[pearClient] Opening position with payload:', JSON.stringify(payload, null, 2));
  console.log('[pearClient] Access token (first 20 chars):', accessToken?.substring(0, 20) + '...');

  return pearFetch<OrderResponse>('/positions', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get all open positions for the authenticated user.
 */
export async function getPositions(accessToken: string): Promise<PearPosition[]> {
  const response = await pearFetch<{ positions: PearPosition[] }>('/positions', accessToken, {
    method: 'GET',
  });
  return response.positions || [];
}

/**
 * Get a specific position by ID.
 */
export async function getPositionById(
  accessToken: string,
  positionId: string
): Promise<PearPosition | null> {
  try {
    return await pearFetch<PearPosition>(`/positions/${positionId}`, accessToken, {
      method: 'GET',
    });
  } catch {
    return null;
  }
}

/**
 * Close a position.
 */
export async function closePosition(
  accessToken: string,
  positionId: string
): Promise<OrderResponse> {
  return pearFetch<OrderResponse>(`/positions/${positionId}/close`, accessToken, {
    method: 'POST',
  });
}

/**
 * Get all orders for the authenticated user.
 */
export async function getOrders(accessToken: string): Promise<OrderResponse[]> {
  const response = await pearFetch<{ orders: OrderResponse[] }>('/orders', accessToken, {
    method: 'GET',
  });
  return response.orders || [];
}

/**
 * Cancel an order.
 */
export async function cancelOrder(
  accessToken: string,
  orderId: string
): Promise<void> {
  await pearFetch(`/orders/${orderId}/cancel`, accessToken, {
    method: 'POST',
  });
}
