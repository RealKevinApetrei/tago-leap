/**
 * VWAP Exit Strategy
 *
 * Exits positions when price crosses the Volume Weighted Average Price (VWAP).
 * VWAP is commonly used as a mean reversion indicator.
 *
 * Features:
 * - Exit longs when price drops below VWAP
 * - Exit shorts when price rises above VWAP
 * - Minimum profit requirement before VWAP exit triggers
 *
 * [SALT] Policy-controlled robo managers
 */

import type { SaltPolicy } from '@tago-leap/shared/types';
import type { StrategyExecutionResult } from '../strategyEngine';
import { getPositions, getCandles, closePosition, calculateVWAP } from './shared';

// Strategy parameters
export interface VWAPExitParams {
  exitOnCross?: 'below' | 'above' | 'both';  // When to exit (default: 'below' for longs)
  minProfitPct?: number;                      // Minimum profit before VWAP exit (default: 1)
  candleInterval?: '5m' | '15m' | '1h';       // Candle interval for VWAP (default: '15m')
  lookbackCandles?: number;                   // Number of candles for VWAP (default: 50)
}

// Execute the VWAP exit strategy
export async function executeVWAPExitStrategy(
  walletAddress: string,
  accountId: string,
  params: VWAPExitParams,
  policy: SaltPolicy | null
): Promise<StrategyExecutionResult> {
  const exitOnCross = params.exitOnCross ?? 'below';
  const minProfitPct = params.minProfitPct ?? 1;
  const candleInterval = params.candleInterval ?? '15m';
  const lookbackCandles = params.lookbackCandles ?? 50;

  console.log(`[VWAPExit] Running for wallet ${walletAddress.slice(0, 10)}...`);
  console.log(`[VWAPExit] Exit on: ${exitOnCross}, Min profit: ${minProfitPct}%`);

  try {
    const positions = await getPositions(walletAddress);

    if (positions.length === 0) {
      return {
        success: true,
        action: 'none',
        details: { message: 'No open positions' },
      };
    }

    console.log(`[VWAPExit] Found ${positions.length} open positions`);

    const closedPositions: { asset: string; reason: string; pnlPct: number }[] = [];
    const checkedPositions: { asset: string; pnlPct: number; currentPrice: number; vwap: number; action: string }[] = [];

    for (const position of positions) {
      const asset = position.coin;
      const isLong = parseFloat(position.szi) > 0;
      const pnlPct = parseFloat(position.returnOnEquity) * 100;
      const positionValue = Math.abs(parseFloat(position.positionValue));
      const leverage = position.leverage?.value || 1;
      const size = Math.abs(parseFloat(position.szi));
      const currentPrice = positionValue / size;

      // Fetch candles for VWAP calculation
      const candles = await getCandles(asset, candleInterval, lookbackCandles);

      if (candles.length < 10) {
        console.log(`[VWAPExit] ${asset}: Not enough candle data (${candles.length})`);
        checkedPositions.push({
          asset,
          pnlPct,
          currentPrice,
          vwap: 0,
          action: 'insufficient_data',
        });
        continue;
      }

      const vwap = calculateVWAP(candles);
      const priceVsVwap = ((currentPrice - vwap) / vwap) * 100;

      console.log(`[VWAPExit] ${asset}: Price $${currentPrice.toFixed(2)}, VWAP $${vwap.toFixed(2)} (${priceVsVwap > 0 ? '+' : ''}${priceVsVwap.toFixed(2)}%)`);

      let shouldClose = false;
      let closeReason = '';

      // Check if minimum profit is met
      if (pnlPct >= minProfitPct) {
        // For longs: exit when price drops below VWAP
        if (isLong && (exitOnCross === 'below' || exitOnCross === 'both')) {
          if (currentPrice < vwap) {
            shouldClose = true;
            closeReason = `Long below VWAP (price: ${currentPrice.toFixed(2)}, VWAP: ${vwap.toFixed(2)})`;
            console.log(`[VWAPExit] ${asset} LONG below VWAP - closing!`);
          }
        }

        // For shorts: exit when price rises above VWAP
        if (!isLong && (exitOnCross === 'above' || exitOnCross === 'both')) {
          if (currentPrice > vwap) {
            shouldClose = true;
            closeReason = `Short above VWAP (price: ${currentPrice.toFixed(2)}, VWAP: ${vwap.toFixed(2)})`;
            console.log(`[VWAPExit] ${asset} SHORT above VWAP - closing!`);
          }
        }
      }

      if (shouldClose) {
        const closed = await closePosition(walletAddress, asset, positionValue, isLong, leverage);

        if (closed) {
          closedPositions.push({ asset, reason: closeReason, pnlPct });
          checkedPositions.push({ asset, pnlPct, currentPrice, vwap, action: 'vwap_exit' });
        } else {
          checkedPositions.push({ asset, pnlPct, currentPrice, vwap, action: 'close_failed' });
        }
      } else {
        checkedPositions.push({
          asset,
          pnlPct,
          currentPrice,
          vwap,
          action: pnlPct < minProfitPct ? 'below_min_profit' : 'held',
        });
      }
    }

    if (closedPositions.length > 0) {
      return {
        success: true,
        action: 'position_closed',
        details: {
          closedPositions,
          closedCount: closedPositions.length,
          exitOnCross,
          minProfitPct,
          positions: checkedPositions,
        },
      };
    }

    return {
      success: true,
      action: 'none',
      details: {
        message: 'No positions triggered VWAP exit',
        checkedCount: positions.length,
        exitOnCross,
        minProfitPct,
        positions: checkedPositions,
      },
    };
  } catch (error: any) {
    console.error('[VWAPExit] Strategy error:', error);
    return {
      success: false,
      error: error?.message || 'VWAP exit strategy failed',
    };
  }
}
