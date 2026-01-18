/**
 * Shared utilities for strategies
 *
 * Common functions used by all strategy implementations.
 */

// Hyperliquid position structure
export interface HyperliquidPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  leverage: {
    type: string;
    value: number;
  };
}

// Hyperliquid candle structure
export interface HyperliquidCandle {
  t: number;   // Timestamp
  o: string;   // Open
  h: string;   // High
  l: string;   // Low
  c: string;   // Close
  v: string;   // Volume
}

// Fetch positions from Hyperliquid
export async function getPositions(walletAddress: string): Promise<HyperliquidPosition[]> {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: walletAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const data = await response.json();
    const assetPositions = data.assetPositions || [];

    return assetPositions
      .filter((ap: any) => parseFloat(ap.position.szi) !== 0)
      .map((ap: any) => ap.position);
  } catch (error) {
    console.error('[Strategies] Failed to fetch positions:', error);
    throw error;
  }
}

// Fetch candles from Hyperliquid
export async function getCandles(
  coin: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '15m',
  limit: number = 100
): Promise<HyperliquidCandle[]> {
  try {
    const endTime = Date.now();
    const intervalMs = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
    }[interval];
    const startTime = endTime - (limit * intervalMs);

    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: {
          coin,
          interval,
          startTime,
          endTime,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid candle API error: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`[Strategies] Failed to fetch candles for ${coin}:`, error);
    return [];
  }
}

// Close a position via the API
export async function closePosition(
  walletAddress: string,
  asset: string,
  size: number,
  isLong: boolean,
  leverage: number
): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/pear/positions/close-by-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        asset,
        size,
        isLong,
        leverage,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(`[Strategies] Failed to close ${asset}:`, data.error);
      return false;
    }

    console.log(`[Strategies] Successfully closed ${asset} position`);
    return true;
  } catch (error) {
    console.error(`[Strategies] Error closing ${asset}:`, error);
    return false;
  }
}

// Calculate VWAP from candles
export function calculateVWAP(candles: HyperliquidCandle[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const high = parseFloat(candle.h);
    const low = parseFloat(candle.l);
    const close = parseFloat(candle.c);
    const volume = parseFloat(candle.v);

    const typicalPrice = (high + low + close) / 3;
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

// Calculate ADX (Average Directional Index)
export function calculateADX(candles: HyperliquidCandle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  // Calculate TR, +DM, -DM
  for (let i = 1; i < candles.length; i++) {
    const high = parseFloat(candles[i].h);
    const low = parseFloat(candles[i].l);
    const close = parseFloat(candles[i].c);
    const prevHigh = parseFloat(candles[i - 1].h);
    const prevLow = parseFloat(candles[i - 1].l);
    const prevClose = parseFloat(candles[i - 1].c);

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  // Smooth with Wilder's smoothing
  const smoothedTR = wilderSmooth(trueRanges, period);
  const smoothedPlusDM = wilderSmooth(plusDM, period);
  const smoothedMinusDM = wilderSmooth(minusDM, period);

  if (smoothedTR === 0) return 0;

  // Calculate +DI and -DI
  const plusDI = (smoothedPlusDM / smoothedTR) * 100;
  const minusDI = (smoothedMinusDM / smoothedTR) * 100;

  // Calculate DX
  const diSum = plusDI + minusDI;
  if (diSum === 0) return 0;
  const dx = (Math.abs(plusDI - minusDI) / diSum) * 100;

  return dx; // For simplicity, return DX instead of full ADX smoothing
}

// Wilder's smoothing method
function wilderSmooth(values: number[], period: number): number {
  if (values.length < period) return 0;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let smoothed = sum;
  for (let i = period; i < values.length; i++) {
    smoothed = smoothed - (smoothed / period) + values[i];
  }

  return smoothed / period;
}

// Simple Moving Average
export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
