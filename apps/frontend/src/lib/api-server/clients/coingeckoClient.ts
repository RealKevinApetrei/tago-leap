/**
 * CoinGecko API client for fetching historical price data
 * Supports dynamic token lookup - any token on CoinGecko will work
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Static mapping of common trading symbols to CoinGecko IDs
const KNOWN_COINGECKO_IDS: Record<string, string> = {
  // Major coins
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  ATOM: 'cosmos',
  NEAR: 'near',

  // AI tokens
  FET: 'fetch-ai',
  TAO: 'bittensor',
  RENDER: 'render-token',
  WLD: 'worldcoin-wld',
  AGIX: 'singularitynet',
  OCEAN: 'ocean-protocol',
  VIRTUAL: 'virtual-protocol',

  // DeFi
  UNI: 'uniswap',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  LINK: 'chainlink',
  SNX: 'havven',
  COMP: 'compound-governance-token',

  // Layer 2 / Infrastructure
  ARB: 'arbitrum',
  OP: 'optimism',
  APT: 'aptos',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  STX: 'blockstack',

  // Meme coins
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FLOKI: 'floki',
  TRUMP: 'official-trump',
  MELANIA: 'melania-meme',

  // Commodities
  GOLD: 'pax-gold',
  PAXG: 'pax-gold',
};

// Dynamic cache for discovered token IDs
const dynamicIdCache: Record<string, string> = {};

export interface PricePoint {
  timestamp: number;
  date: string;
  price: number;
}

export interface PerformanceDataPoint {
  timestamp: number;
  date: string;
  longPrice: number;
  shortPrice: number;
  performance: number;
}

export interface NarrativePerformance {
  narrativeId: string;
  longAsset: string;
  shortAsset: string;
  dataPoints: PerformanceDataPoint[];
  totalReturn: number;
  maxDrawdown: number;
}

// Simple in-memory cache (6 hour TTL to reduce API calls)
const priceCache = new Map<string, { data: PricePoint[]; expiry: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

async function rateLimitedFetch(url: string, retries = 3): Promise<Response> {
  // Wait if needed to respect rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      // Rate limited - wait and retry
      const waitTime = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
      console.log(`[CoinGecko] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('CoinGecko API rate limit exceeded. Please try again later.');
}

async function searchCoinGeckoId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();

  if (dynamicIdCache[upperSymbol]) {
    return dynamicIdCache[upperSymbol];
  }

  try {
    console.log(`[CoinGecko] Searching for token: ${symbol}`);
    const response = await rateLimitedFetch(
      `${COINGECKO_API_BASE}/search?query=${encodeURIComponent(symbol)}`
    );

    if (!response.ok) {
      console.error(`[CoinGecko] Search failed for ${symbol}:`, response.status);
      return null;
    }

    const data = (await response.json()) as {
      coins: Array<{ id: string; symbol: string; market_cap_rank: number | null }>;
    };

    const matches = data.coins.filter(
      (c) => c.symbol.toUpperCase() === upperSymbol
    );

    if (matches.length === 0) {
      console.log(`[CoinGecko] No exact match found for ${symbol}`);
      return null;
    }

    matches.sort((a, b) => {
      if (a.market_cap_rank === null) return 1;
      if (b.market_cap_rank === null) return -1;
      return a.market_cap_rank - b.market_cap_rank;
    });

    const bestMatch = matches[0];
    console.log(`[CoinGecko] Found token ${symbol} -> ${bestMatch.id}`);

    dynamicIdCache[upperSymbol] = bestMatch.id;
    return bestMatch.id;
  } catch (err) {
    console.error(`[CoinGecko] Search error for ${symbol}:`, err);
    return null;
  }
}

export async function getCoinGeckoId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();

  if (KNOWN_COINGECKO_IDS[upperSymbol]) {
    return KNOWN_COINGECKO_IDS[upperSymbol];
  }

  if (dynamicIdCache[upperSymbol]) {
    return dynamicIdCache[upperSymbol];
  }

  return searchCoinGeckoId(symbol);
}

export async function getHistoricalPrices(
  symbol: string,
  days: number = 180
): Promise<PricePoint[]> {
  const coinId = await getCoinGeckoId(symbol);
  if (!coinId) {
    throw new Error(`Token "${symbol}" not found on CoinGecko`);
  }

  const cacheKey = `${coinId}-${days}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  console.log(`[CoinGecko] Fetching prices for ${symbol}`);

  const response = await rateLimitedFetch(url);

  if (!response.ok) {
    const error = await response.text();
    console.error(`[CoinGecko] API error for ${symbol}:`, response.status, error);
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = (await response.json()) as { prices: [number, number][] };

  const pricePoints: PricePoint[] = data.prices.map(([timestamp, price]) => ({
    timestamp,
    date: new Date(timestamp).toISOString().split('T')[0],
    price,
  }));

  priceCache.set(cacheKey, {
    data: pricePoints,
    expiry: Date.now() + CACHE_TTL,
  });

  return pricePoints;
}

/**
 * Calculate performance for a single asset (long-only or short-only strategy)
 * For long: performance = price change percentage
 * For short: performance = inverse of price change (price down = profit)
 */
export async function calculateSingleAssetPerformance(
  narrativeId: string,
  asset: string,
  isLong: boolean,
  days: number = 180
): Promise<NarrativePerformance> {
  const prices = await getHistoricalPrices(asset, days);

  const basePrice = prices[0].price;

  let maxDrawdown = 0;
  let peakPerformance = 0;

  const dataPoints: PerformanceDataPoint[] = prices.map((point) => {
    // For long: positive when price goes up
    // For short: positive when price goes down
    const priceChange = ((point.price / basePrice) - 1) * 100;
    const performance = isLong ? priceChange : -priceChange;

    if (performance > peakPerformance) {
      peakPerformance = performance;
    }
    const drawdown = performance - peakPerformance;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }

    return {
      timestamp: point.timestamp,
      date: point.date,
      longPrice: isLong ? (point.price / basePrice) * 100 : 100,
      shortPrice: isLong ? 100 : (point.price / basePrice) * 100,
      performance: Math.round(performance * 100) / 100,
    };
  });

  const totalReturn = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].performance : 0;

  return {
    narrativeId,
    longAsset: isLong ? asset : '',
    shortAsset: isLong ? '' : asset,
    dataPoints,
    totalReturn: Math.round(totalReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
  };
}

export async function calculateNarrativePerformance(
  narrativeId: string,
  longAsset: string,
  shortAsset: string,
  days: number = 180
): Promise<NarrativePerformance> {
  const [longPrices, shortPrices] = await Promise.all([
    getHistoricalPrices(longAsset, days),
    getHistoricalPrices(shortAsset, days),
  ]);

  const minLength = Math.min(longPrices.length, shortPrices.length);
  const alignedLong = longPrices.slice(-minLength);
  const alignedShort = shortPrices.slice(-minLength);

  const baseLongPrice = alignedLong[0].price;
  const baseShortPrice = alignedShort[0].price;

  let maxDrawdown = 0;
  let peakPerformance = 0;

  const dataPoints: PerformanceDataPoint[] = alignedLong.map((longPoint, i) => {
    const shortPoint = alignedShort[i];

    const normalizedLong = (longPoint.price / baseLongPrice) * 100;
    const normalizedShort = (shortPoint.price / baseShortPrice) * 100;

    const performance = ((normalizedLong / normalizedShort) - 1) * 100;

    if (performance > peakPerformance) {
      peakPerformance = performance;
    }
    const drawdown = performance - peakPerformance;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }

    return {
      timestamp: longPoint.timestamp,
      date: longPoint.date,
      longPrice: normalizedLong,
      shortPrice: normalizedShort,
      performance: Math.round(performance * 100) / 100,
    };
  });

  const totalReturn = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].performance : 0;

  return {
    narrativeId,
    longAsset,
    shortAsset,
    dataPoints,
    totalReturn: Math.round(totalReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
  };
}
