/**
 * CoinGecko API client for fetching historical price data
 * Supports dynamic token lookup - any token on CoinGecko will work
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Static mapping of common trading symbols to CoinGecko IDs (for faster lookup)
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

  // Commodities / Real-world assets (mapped to crypto equivalents)
  GOLD: 'pax-gold',        // PAXG - gold-backed token
  XAUT: 'tether-gold',     // Tether Gold
  PAXG: 'pax-gold',
  SILVER: 'silver-token',  // Best effort - may not have good data

  // Stocks (synthetic assets - mapped to related tokens if available)
  GOOGL: 'alphabet-inc',   // May not exist on CoinGecko
  AAPL: 'apple-inc',       // May not exist on CoinGecko
  TSLA: 'tesla-inc',       // May not exist on CoinGecko
  SPY: 'spdr-sp-500-etf',  // May not exist on CoinGecko
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
  performance: number; // percentage
}

export interface NarrativePerformance {
  narrativeId: string;
  longAsset: string;
  shortAsset: string;
  dataPoints: PerformanceDataPoint[];
  totalReturn: number;
  maxDrawdown: number;
}

// Simple in-memory cache (1 hour TTL)
const priceCache = new Map<string, { data: PricePoint[]; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Search for a token on CoinGecko by symbol
 */
async function searchCoinGeckoId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check dynamic cache first
  if (dynamicIdCache[upperSymbol]) {
    return dynamicIdCache[upperSymbol];
  }

  try {
    console.log(`[CoinGecko] Searching for token: ${symbol}`);
    const response = await fetch(
      `${COINGECKO_API_BASE}/search?query=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.error(`[CoinGecko] Search failed for ${symbol}:`, response.status);
      return null;
    }

    const data = (await response.json()) as {
      coins: Array<{ id: string; symbol: string; market_cap_rank: number | null }>;
    };

    // Find best match - exact symbol match with highest market cap
    const matches = data.coins.filter(
      (c) => c.symbol.toUpperCase() === upperSymbol
    );

    if (matches.length === 0) {
      console.log(`[CoinGecko] No exact match found for ${symbol}`);
      return null;
    }

    // Sort by market cap rank (lower is better, null goes last)
    matches.sort((a, b) => {
      if (a.market_cap_rank === null) return 1;
      if (b.market_cap_rank === null) return -1;
      return a.market_cap_rank - b.market_cap_rank;
    });

    const bestMatch = matches[0];
    console.log(`[CoinGecko] Found token ${symbol} -> ${bestMatch.id} (rank: ${bestMatch.market_cap_rank})`);

    // Cache the result
    dynamicIdCache[upperSymbol] = bestMatch.id;
    return bestMatch.id;
  } catch (err) {
    console.error(`[CoinGecko] Search error for ${symbol}:`, err);
    return null;
  }
}

/**
 * Get CoinGecko ID for a trading symbol (checks static mapping first, then searches)
 */
export async function getCoinGeckoId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check static mapping first
  if (KNOWN_COINGECKO_IDS[upperSymbol]) {
    return KNOWN_COINGECKO_IDS[upperSymbol];
  }

  // Check dynamic cache
  if (dynamicIdCache[upperSymbol]) {
    return dynamicIdCache[upperSymbol];
  }

  // Search CoinGecko for unknown tokens
  return searchCoinGeckoId(symbol);
}

/**
 * Fetch historical prices for an asset from CoinGecko
 */
export async function getHistoricalPrices(
  symbol: string,
  days: number = 180
): Promise<PricePoint[]> {
  const coinId = await getCoinGeckoId(symbol);
  if (!coinId) {
    throw new Error(`Unknown asset symbol: ${symbol}. Token not found on CoinGecko.`);
  }

  const cacheKey = `${coinId}-${days}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[CoinGecko] Cache hit for ${symbol}`);
    return cached.data;
  }

  const url = `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  console.log(`[CoinGecko] Fetching prices for ${symbol}:`, url);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

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

  // Cache the result
  priceCache.set(cacheKey, {
    data: pricePoints,
    expiry: Date.now() + CACHE_TTL,
  });

  console.log(`[CoinGecko] Fetched ${pricePoints.length} price points for ${symbol}`);
  return pricePoints;
}

/**
 * Calculate performance of a long/short pair over time
 * Performance = (longPrice / longPrice[0]) / (shortPrice / shortPrice[0]) - 1
 */
export async function calculateNarrativePerformance(
  narrativeId: string,
  longAsset: string,
  shortAsset: string,
  days: number = 180
): Promise<NarrativePerformance> {
  console.log(`[CoinGecko] Calculating performance for ${longAsset} vs ${shortAsset}`);

  // Fetch prices in parallel
  const [longPrices, shortPrices] = await Promise.all([
    getHistoricalPrices(longAsset, days),
    getHistoricalPrices(shortAsset, days),
  ]);

  // Align data by date (use the shorter array length)
  const minLength = Math.min(longPrices.length, shortPrices.length);
  const alignedLong = longPrices.slice(-minLength);
  const alignedShort = shortPrices.slice(-minLength);

  // Calculate normalized performance
  const baseLongPrice = alignedLong[0].price;
  const baseShortPrice = alignedShort[0].price;

  let maxDrawdown = 0;
  let peakPerformance = 0;

  const dataPoints: PerformanceDataPoint[] = alignedLong.map((longPoint, i) => {
    const shortPoint = alignedShort[i];

    // Normalize to starting price = 100
    const normalizedLong = (longPoint.price / baseLongPrice) * 100;
    const normalizedShort = (shortPoint.price / baseShortPrice) * 100;

    // Performance: how much the long/short spread has moved
    const performance = ((normalizedLong / normalizedShort) - 1) * 100;

    // Track max drawdown
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
      performance: Math.round(performance * 100) / 100, // Round to 2 decimals
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

/**
 * Check if we support historical data for an asset
 */
export async function isAssetSupported(symbol: string): Promise<boolean> {
  const coinId = await getCoinGeckoId(symbol);
  return coinId !== null;
}
