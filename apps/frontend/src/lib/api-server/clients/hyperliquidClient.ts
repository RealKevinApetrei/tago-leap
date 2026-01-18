/**
 * Hyperliquid API client for fetching historical candle data
 * Used for calculating pair/basket ratio performance (same price source as Pear trades)
 */

const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz/info';

export interface Candle {
  timestamp: number;  // ms timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
  ratio: number;       // Price ratio (long/short)
  performance: number; // % return from start
}

export interface PairStatistics {
  correlation: number;      // Pearson correlation of returns (-1 to 1)
  cointegrated: boolean;    // Simplified cointegration test result
  rollingZScore: number;    // Current z-score of the spread
  volatility: number;       // Annualized volatility of the spread (%)
  beta: number;             // Beta (hedge ratio) of long vs short
  betaWeights: {            // Suggested weights for beta-neutral position
    long: number;
    short: number;
  };
}

export interface RatioPerformance {
  narrativeId: string;
  longAsset: string;
  shortAsset: string;
  longWeights?: number[];
  shortWeights?: number[];
  dataPoints: PerformanceDataPoint[];
  totalReturn: number;
  maxDrawdown: number;
  startRatio: number;
  endRatio: number;
  statistics?: PairStatistics;
}

// Simple in-memory cache (1 hour TTL)
const candleCache = new Map<string, { data: Candle[]; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch candle data from Hyperliquid
 * @param coin - Asset symbol (e.g., "BTC", "ETH")
 * @param interval - Candle interval: "1m", "5m", "15m", "1h", "4h", "1d"
 * @param startTime - Start timestamp in ms
 * @param endTime - End timestamp in ms
 */
export async function getCandles(
  coin: string,
  interval: string,
  startTime: number,
  endTime?: number
): Promise<Candle[]> {
  const cacheKey = `${coin}-${interval}-${startTime}-${endTime || 'now'}`;
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const request: any = {
    type: 'candleSnapshot',
    req: {
      coin,
      interval,
      startTime,
    },
  };

  if (endTime) {
    request.req.endTime = endTime;
  }

  console.log(`[Hyperliquid] Fetching candles for ${coin} (${interval})`);

  const response = await fetch(HYPERLIQUID_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Hyperliquid] API error for ${coin}:`, response.status, error);
    throw new Error(`Hyperliquid API error: ${response.status}`);
  }

  // Response format: [[timestamp, open, high, low, close, volume, numTrades], ...]
  const data = await response.json();

  // Validate response is an array (HL may return error objects)
  if (!Array.isArray(data)) {
    console.error(`[Hyperliquid] Unexpected response for ${coin}:`, data);
    throw new Error(`No candle data found for ${coin}`);
  }

  // Handle empty response
  if (data.length === 0) {
    console.warn(`[Hyperliquid] No candle data returned for ${coin}`);
    return [];
  }

  const candles: Candle[] = data.map((candle: any) => {
    // Support both array format and object format
    if (Array.isArray(candle)) {
      const [t, o, h, l, c, v] = candle;
      return {
        timestamp: t,
        open: parseFloat(o),
        high: parseFloat(h),
        low: parseFloat(l),
        close: parseFloat(c),
        volume: parseFloat(v),
      };
    } else {
      // Object format fallback
      return {
        timestamp: candle.t || candle.timestamp,
        open: parseFloat(candle.o || candle.open),
        high: parseFloat(candle.h || candle.high),
        low: parseFloat(candle.l || candle.low),
        close: parseFloat(candle.c || candle.close),
        volume: parseFloat(candle.v || candle.volume || 0),
      };
    }
  });

  candleCache.set(cacheKey, {
    data: candles,
    expiry: Date.now() + CACHE_TTL,
  });

  return candles;
}

/**
 * Get daily prices from Hyperliquid candles
 */
export async function getHistoricalPrices(
  symbol: string,
  days: number = 30
): Promise<PricePoint[]> {
  const endTime = Date.now();
  const startTime = endTime - (days * 24 * 60 * 60 * 1000);

  const candles = await getCandles(symbol, '1d', startTime, endTime);

  return candles.map(candle => ({
    timestamp: candle.timestamp,
    date: new Date(candle.timestamp).toISOString().split('T')[0],
    price: candle.close,
  }));
}

/**
 * Calculate weighted price for a basket of assets
 * Uses geometric mean with weights as exponents (Pear's weighted ratio formula)
 */
function calculateWeightedPrice(prices: number[], weights: number[]): number {
  if (prices.length !== weights.length || prices.length === 0) {
    return 0;
  }

  // Geometric weighted mean: product of (price ^ weight)
  let result = 1;
  for (let i = 0; i < prices.length; i++) {
    result *= Math.pow(prices[i], weights[i]);
  }

  return result;
}

/**
 * Calculate ratio performance for a pair/basket trade
 * Uses Pear's weighted price ratio formula for baskets
 */
export async function calculateRatioPerformance(
  narrativeId: string,
  longAssets: Array<{ asset: string; weight: number }>,
  shortAssets: Array<{ asset: string; weight: number }>,
  days: number = 30
): Promise<RatioPerformance> {
  // Validate: need at least one asset on each side for ratio calculation
  if (longAssets.length === 0 || shortAssets.length === 0) {
    throw new Error('Ratio calculation requires at least one asset on each side. Use calculateSingleAssetPerformance for long-only or short-only.');
  }

  // Fetch prices for all assets in parallel
  const allAssets = [...longAssets, ...shortAssets];
  const pricePromises = allAssets.map(a => getHistoricalPrices(a.asset, days));
  const allPrices = await Promise.all(pricePromises);

  // Separate long and short prices
  const longPrices = allPrices.slice(0, longAssets.length);
  const shortPrices = allPrices.slice(longAssets.length);

  // Verify we got price data for all assets
  const emptyLong = longAssets.filter((_, i) => longPrices[i].length === 0);
  const emptyShort = shortAssets.filter((_, i) => shortPrices[i].length === 0);
  if (emptyLong.length > 0 || emptyShort.length > 0) {
    const missing = [...emptyLong.map(a => a.asset), ...emptyShort.map(a => a.asset)];
    throw new Error(`No price data found for: ${missing.join(', ')}`);
  }

  // Find common date range - now safe because we verified arrays are non-empty
  const longLengths = longPrices.map(p => p.length);
  const shortLengths = shortPrices.map(p => p.length);
  const minLength = Math.min(...longLengths, ...shortLengths);

  // Align all price arrays to the same length
  const alignedLongPrices = longPrices.map(p => p.slice(-minLength));
  const alignedShortPrices = shortPrices.map(p => p.slice(-minLength));

  // Calculate weighted prices for each day
  const longWeights = longAssets.map(a => a.weight);
  const shortWeights = shortAssets.map(a => a.weight);

  const dataPoints: PerformanceDataPoint[] = [];
  let maxDrawdown = 0;
  let peakPerformance = 0;
  let startRatio = 0;
  let endRatio = 0;

  for (let i = 0; i < minLength; i++) {
    const timestamp = alignedLongPrices[0][i].timestamp;
    const date = alignedLongPrices[0][i].date;

    // Get prices for this day
    const dayLongPrices = alignedLongPrices.map(p => p[i].price);
    const dayShortPrices = alignedShortPrices.map(p => p[i].price);

    // Calculate weighted prices
    const weightedLongPrice = calculateWeightedPrice(dayLongPrices, longWeights);
    const weightedShortPrice = calculateWeightedPrice(dayShortPrices, shortWeights);

    // Calculate ratio
    const ratio = weightedShortPrice > 0 ? weightedLongPrice / weightedShortPrice : 0;

    if (i === 0) {
      startRatio = ratio;
    }
    endRatio = ratio;

    // Calculate performance (% change from start)
    const performance = startRatio > 0 ? ((ratio / startRatio) - 1) * 100 : 0;

    // Track drawdown
    if (performance > peakPerformance) {
      peakPerformance = performance;
    }
    const drawdown = performance - peakPerformance;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }

    dataPoints.push({
      timestamp,
      date,
      longPrice: weightedLongPrice,
      shortPrice: weightedShortPrice,
      ratio: Math.round(ratio * 10000) / 10000,
      performance: Math.round(performance * 100) / 100,
    });
  }

  const totalReturn = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].performance : 0;

  // Calculate statistics for simple pair trades (single long vs single short)
  let statistics: PairStatistics | undefined;
  if (longAssets.length === 1 && shortAssets.length === 1 && minLength >= 10) {
    const longPriceArray = alignedLongPrices[0].map(p => p.price);
    const shortPriceArray = alignedShortPrices[0].map(p => p.price);
    const ratioArray = dataPoints.map(d => d.ratio);
    statistics = calculatePairStatistics(longPriceArray, shortPriceArray, ratioArray);
  }

  return {
    narrativeId,
    longAsset: longAssets.map(a => a.asset).join('+'),
    shortAsset: shortAssets.map(a => a.asset).join('+'),
    longWeights,
    shortWeights,
    dataPoints,
    totalReturn: Math.round(totalReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    startRatio,
    endRatio,
    statistics,
  };
}

/**
 * Calculate performance for a simple pair trade (1:1 long vs short)
 */
export async function calculatePairPerformance(
  narrativeId: string,
  longAsset: string,
  shortAsset: string,
  days: number = 30
): Promise<RatioPerformance> {
  return calculateRatioPerformance(
    narrativeId,
    [{ asset: longAsset, weight: 1 }],
    [{ asset: shortAsset, weight: 1 }],
    days
  );
}

/**
 * Calculate performance for a single asset (long-only or short-only)
 */
export async function calculateSingleAssetPerformance(
  narrativeId: string,
  asset: string,
  isLong: boolean,
  days: number = 30
): Promise<RatioPerformance> {
  const prices = await getHistoricalPrices(asset, days);

  if (prices.length === 0) {
    throw new Error(`No price data found for ${asset}`);
  }

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
      longPrice: isLong ? point.price : basePrice,
      shortPrice: isLong ? basePrice : point.price,
      ratio: isLong ? point.price / basePrice : basePrice / point.price,
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
    startRatio: 1,
    endRatio: dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].ratio : 1,
  };
}

/**
 * Get available assets on Hyperliquid
 */
export async function getAvailableAssets(): Promise<string[]> {
  const response = await fetch(HYPERLIQUID_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'meta' }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Hyperliquid assets: ${response.status}`);
  }

  const meta = await response.json();

  // Validate response structure
  if (!meta || !Array.isArray(meta.universe)) {
    console.error('[Hyperliquid] Unexpected meta response:', meta);
    return [];
  }

  return meta.universe.map((asset: any) => asset.name || asset.coin || '').filter(Boolean);
}

// ============================================================================
// PAIR STATISTICS CALCULATIONS (Agent Pear style)
// ============================================================================

/**
 * Calculate log returns from price series
 */
function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return returns;
}

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation of an array
 */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

/**
 * Calculate Pearson correlation between two arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(-n);
  const ySlice = y.slice(-n);

  const xMean = mean(xSlice);
  const yMean = mean(ySlice);

  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSq * ySumSq);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculate beta (hedge ratio) using OLS regression
 * Beta = Cov(X, Y) / Var(Y)
 * Where X is long returns, Y is short returns
 */
function calculateBeta(longReturns: number[], shortReturns: number[]): number {
  const n = Math.min(longReturns.length, shortReturns.length);
  if (n < 2) return 1;

  const xSlice = longReturns.slice(-n);
  const ySlice = shortReturns.slice(-n);

  const xMean = mean(xSlice);
  const yMean = mean(ySlice);

  let covariance = 0;
  let yVariance = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    covariance += xDiff * yDiff;
    yVariance += yDiff * yDiff;
  }

  if (yVariance === 0) return 1;

  return covariance / yVariance;
}

/**
 * Simplified cointegration test using spread stationarity
 * Uses variance ratio test - if ratio close to 1, likely cointegrated
 * Real cointegration would use Augmented Dickey-Fuller test
 */
function isCointegrated(spreadReturns: number[]): boolean {
  if (spreadReturns.length < 20) return false;

  // Simple heuristic: check if spread mean-reverts
  // Look at autocorrelation - negative autocorrelation suggests mean reversion
  const n = spreadReturns.length;
  const avg = mean(spreadReturns);

  let autoCorr = 0;
  let variance = 0;

  for (let i = 1; i < n; i++) {
    autoCorr += (spreadReturns[i] - avg) * (spreadReturns[i - 1] - avg);
    variance += Math.pow(spreadReturns[i] - avg, 2);
  }

  if (variance === 0) return false;

  const lag1Autocorrelation = autoCorr / variance;

  // Negative or low autocorrelation suggests mean reversion (cointegration)
  // Typically, autocorrelation < 0.5 indicates potential cointegration
  return lag1Autocorrelation < 0.5;
}

/**
 * Calculate rolling z-score of the spread
 * Z = (current_spread - mean) / std_dev
 */
function calculateZScore(ratios: number[], window: number = 20): number {
  if (ratios.length < window) {
    return 0;
  }

  const recent = ratios.slice(-window);
  const avg = mean(recent);
  const std = stdDev(recent);

  if (std === 0) return 0;

  const currentRatio = ratios[ratios.length - 1];
  return (currentRatio - avg) / std;
}

/**
 * Calculate annualized volatility of the spread
 */
function calculateVolatility(spreadReturns: number[]): number {
  if (spreadReturns.length < 2) return 0;

  const std = stdDev(spreadReturns);
  // Annualize: daily std * sqrt(365)
  return std * Math.sqrt(365) * 100; // Convert to percentage
}

/**
 * Calculate beta-neutral weights
 * For a beta-neutral position:
 * - Long weight = 1 / (1 + |beta|)
 * - Short weight = |beta| / (1 + |beta|)
 */
function calculateBetaWeights(beta: number): { long: number; short: number } {
  const absBeta = Math.abs(beta);

  if (absBeta < 0.01) {
    // If beta is very small, use equal weights
    return { long: 0.5, short: 0.5 };
  }

  // For beta > 1: long asset moves more, so we need less of it
  // For beta < 1: long asset moves less, so we need more of it
  const longWeight = 1 / (1 + absBeta);
  const shortWeight = absBeta / (1 + absBeta);

  return {
    long: Math.round(longWeight * 1000) / 1000,
    short: Math.round(shortWeight * 1000) / 1000,
  };
}

/**
 * Calculate all pair statistics from price data
 */
export function calculatePairStatistics(
  longPrices: number[],
  shortPrices: number[],
  ratios: number[]
): PairStatistics {
  // Calculate returns
  const longReturns = calculateLogReturns(longPrices);
  const shortReturns = calculateLogReturns(shortPrices);
  const spreadReturns = calculateLogReturns(ratios);

  // Calculate all statistics
  const correlation = pearsonCorrelation(longReturns, shortReturns);
  const beta = calculateBeta(longReturns, shortReturns);
  const cointegrated = isCointegrated(spreadReturns);
  const rollingZScore = calculateZScore(ratios, 20);
  const volatility = calculateVolatility(spreadReturns);
  const betaWeights = calculateBetaWeights(beta);

  return {
    correlation: Math.round(correlation * 100) / 100,
    cointegrated,
    rollingZScore: Math.round(rollingZScore * 100) / 100,
    volatility: Math.round(volatility),
    beta: Math.round(beta * 1000) / 1000,
    betaWeights,
  };
}

/**
 * Calculate pair statistics for two assets
 * Fetches price data and computes all stats
 */
export async function getPairStatistics(
  longAsset: string,
  shortAsset: string,
  days: number = 30
): Promise<PairStatistics> {
  const [longPrices, shortPrices] = await Promise.all([
    getHistoricalPrices(longAsset, days),
    getHistoricalPrices(shortAsset, days),
  ]);

  // Validate we have price data
  if (longPrices.length === 0) {
    throw new Error(`No price data found for ${longAsset}`);
  }
  if (shortPrices.length === 0) {
    throw new Error(`No price data found for ${shortAsset}`);
  }

  const minLength = Math.min(longPrices.length, shortPrices.length);

  if (minLength < 5) {
    throw new Error(`Insufficient price data (${minLength} days) for statistical analysis`);
  }

  const alignedLong = longPrices.slice(-minLength).map(p => p.price);
  const alignedShort = shortPrices.slice(-minLength).map(p => p.price);

  // Calculate ratios
  const ratios = alignedLong.map((lp, i) =>
    alignedShort[i] > 0 ? lp / alignedShort[i] : 0
  );

  return calculatePairStatistics(alignedLong, alignedShort, ratios);
}
