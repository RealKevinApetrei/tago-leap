/**
 * ADX Momentum Exit Strategy
 *
 * Exits positions when the ADX (Average Directional Index) drops below a threshold,
 * indicating that the trend is weakening.
 *
 * ADX measures trend strength:
 * - ADX > 25: Strong trend
 * - ADX < 25: Weak trend / consolidation
 *
 * Features:
 * - Exit when ADX drops below threshold (default: 25)
 * - Minimum profit requirement before ADX exit triggers
 * - Protects gains when momentum fades
 *
 * [SALT] Policy-controlled robo managers
 */

import type { SaltPolicy } from '@tago-leap/shared/types';
import type { StrategyExecutionResult } from '../strategyEngine';
import { getPositions, getCandles, closePosition, calculateADX } from './shared';

// Strategy parameters
export interface ADXMomentumParams {
  adxThreshold?: number;    // Exit when ADX falls below this (default: 25)
  minProfitPct?: number;    // Minimum profit before ADX exit (default: 2)
  adxPeriod?: number;       // ADX calculation period (default: 14)
}

// Execute the ADX momentum strategy
export async function executeADXMomentumStrategy(
  walletAddress: string,
  accountId: string,
  params: ADXMomentumParams,
  policy: SaltPolicy | null
): Promise<StrategyExecutionResult> {
  const adxThreshold = params.adxThreshold ?? 25;
  const minProfitPct = params.minProfitPct ?? 2;
  const adxPeriod = params.adxPeriod ?? 14;

  console.log(`[ADXMomentum] Running for wallet ${walletAddress.slice(0, 10)}...`);
  console.log(`[ADXMomentum] ADX threshold: ${adxThreshold}, Min profit: ${minProfitPct}%`);

  try {
    const positions = await getPositions(walletAddress);

    if (positions.length === 0) {
      return {
        success: true,
        action: 'none',
        details: { message: 'No open positions' },
      };
    }

    console.log(`[ADXMomentum] Found ${positions.length} open positions`);

    const closedPositions: { asset: string; reason: string; pnlPct: number }[] = [];
    const checkedPositions: { asset: string; pnlPct: number; adx: number; action: string }[] = [];

    for (const position of positions) {
      const asset = position.coin;
      const isLong = parseFloat(position.szi) > 0;
      const pnlPct = parseFloat(position.returnOnEquity) * 100;
      const positionValue = Math.abs(parseFloat(position.positionValue));
      const leverage = position.leverage?.value || 1;

      // Fetch candles for ADX calculation (need at least 2x period for accurate ADX)
      const candles = await getCandles(asset, '15m', adxPeriod * 3);

      if (candles.length < adxPeriod + 1) {
        console.log(`[ADXMomentum] ${asset}: Not enough candle data (${candles.length})`);
        checkedPositions.push({
          asset,
          pnlPct,
          adx: 0,
          action: 'insufficient_data',
        });
        continue;
      }

      const adx = calculateADX(candles, adxPeriod);

      console.log(`[ADXMomentum] ${asset}: P&L ${pnlPct.toFixed(2)}%, ADX ${adx.toFixed(1)} (threshold: ${adxThreshold})`);

      let shouldClose = false;
      let closeReason = '';

      // Check if minimum profit is met AND ADX is below threshold
      if (pnlPct >= minProfitPct && adx < adxThreshold) {
        shouldClose = true;
        closeReason = `Trend weakening (ADX: ${adx.toFixed(1)} < ${adxThreshold})`;
        console.log(`[ADXMomentum] ${asset} ADX below threshold - closing!`);
      }

      if (shouldClose) {
        const closed = await closePosition(walletAddress, asset, positionValue, isLong, leverage);

        if (closed) {
          closedPositions.push({ asset, reason: closeReason, pnlPct });
          checkedPositions.push({ asset, pnlPct, adx, action: 'adx_exit' });
        } else {
          checkedPositions.push({ asset, pnlPct, adx, action: 'close_failed' });
        }
      } else {
        let action = 'held';
        if (pnlPct < minProfitPct) {
          action = 'below_min_profit';
        } else if (adx >= adxThreshold) {
          action = 'strong_trend';
        }
        checkedPositions.push({ asset, pnlPct, adx, action });
      }
    }

    if (closedPositions.length > 0) {
      return {
        success: true,
        action: 'position_closed',
        details: {
          closedPositions,
          closedCount: closedPositions.length,
          adxThreshold,
          minProfitPct,
          positions: checkedPositions,
        },
      };
    }

    return {
      success: true,
      action: 'none',
      details: {
        message: 'No positions triggered ADX exit',
        checkedCount: positions.length,
        adxThreshold,
        minProfitPct,
        positions: checkedPositions,
      },
    };
  } catch (error: any) {
    console.error('[ADXMomentum] Strategy error:', error);
    return {
      success: false,
      error: error?.message || 'ADX momentum strategy failed',
    };
  }
}
