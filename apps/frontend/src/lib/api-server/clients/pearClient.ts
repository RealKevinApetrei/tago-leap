import { serverEnv } from '../env';
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

const PEAR_API_BASE = serverEnv.PEAR_API_BASE_URL;

async function pearFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PEAR_API_BASE}${endpoint}`;
  const method = options.method || 'GET';

  console.log('[pearFetch] Request:', { url, method, hasBody: !!options.body });

  if (options.body) {
    try {
      const bodyObj = JSON.parse(options.body as string);
      console.log('[pearFetch] Request payload:', JSON.stringify(bodyObj, null, 2));
    } catch {
      console.log('[pearFetch] Request body (raw):', options.body);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  console.log('[pearFetch] Response:', { status: response.status, statusText: response.statusText });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[pearFetch] Error response body:', errorText);

    let errorDetails: any = null;
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      // Not JSON
    }

    const errorMessage = errorDetails?.message || errorDetails?.error || errorText || 'Unknown error';
    const errorCode = errorDetails?.code || errorDetails?.statusCode || response.status;

    throw new Error(`Pear API error: ${response.status} (${errorCode}) - ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

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

interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated?: boolean;
  }>;
}

async function getHyperliquidAssets(): Promise<string[]> {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'meta' }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Hyperliquid assets: ${response.status}`);
  }

  const meta = await response.json() as HyperliquidMeta;
  return meta.universe.map(asset => asset.name);
}

export async function getMarkets(params?: GetMarketsParams): Promise<MarketsResponse> {
  console.log('[pearClient] Fetching markets from Pear API...');

  try {
    const pearResponse = await fetch(`${PEAR_API_BASE}/markets/active`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (pearResponse.ok) {
      const rawResponse = await pearResponse.json() as ActiveAssetsResponse;

      console.log('[pearClient] Active markets count:', rawResponse.active?.length || 0);

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

      const uniqueAssets = new Set<string>();
      for (const market of markets) {
        for (const asset of market.longAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
        for (const asset of market.shortAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
      }

      console.log(`[pearClient] Found ${markets.length} markets with ${uniqueAssets.size} unique assets`);

      if (uniqueAssets.size >= 50) {
        return { markets, raw: rawResponse };
      }
    }
  } catch (err) {
    console.log('[pearClient] Pear API failed, falling back to Hyperliquid:', err);
  }

  console.log('[pearClient] Fetching from Hyperliquid...');
  const assets = await getHyperliquidAssets();

  console.log(`[pearClient] Found ${assets.length} tradable assets on Hyperliquid`);

  const markets: PearMarket[] = assets.map(asset => ({
    longAssets: [{ asset, weight: 1 }],
    shortAssets: [{ asset, weight: 1 }],
    volume: '0',
    openInterest: '0',
  }));

  return { markets };
}

export async function openPosition(
  accessToken: string,
  payload: OpenPositionPayload
): Promise<OrderResponse> {
  console.log('[pearClient] Opening position with payload:', JSON.stringify(payload, null, 2));
  return pearFetch<OrderResponse>('/positions', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPositions(accessToken: string): Promise<PearPosition[]> {
  const response = await pearFetch<{ positions: PearPosition[] }>('/positions', accessToken, {
    method: 'GET',
  });
  return response.positions || [];
}

export async function closePosition(
  accessToken: string,
  positionId: string
): Promise<OrderResponse> {
  return pearFetch<OrderResponse>(`/positions/${positionId}/close`, accessToken, {
    method: 'POST',
  });
}
