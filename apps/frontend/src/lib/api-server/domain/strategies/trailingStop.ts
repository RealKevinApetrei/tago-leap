/**
 * Trailing Stop Strategy
 *
 * Dynamic stop loss that follows price upward, locking in gains.
 * The stop trails behind the peak price by a fixed percentage.
 *
 * Features:
 * - Configurable trail percentage (default: 3%)
 * - Activation threshold (default: 2% profit)
 * - Uses in-memory peak tracking (resets on script restart)
 *
 * [SALT] Policy-controlled robo managers
 */

import type { SaltPolicy } from '@tago-leap/shared/types';
import type { StrategyExecutionResult } from '../strategyEngine';
import { getPositions, closePosition } from './shared';

// Strategy parameters
export interface TrailingStopParams {
  trailPct?: number;       // Trail behind peak by this % (default: 3)
  activationPct?: number;  // Activate after this % profit (default: 2)
}

// In-memory peak tracking (persists during script runtime)
const peakPrices: Map<string, number> = new Map();

// Get peak key for a position
function getPeakKey(walletAddress: string, asset: string): string {
  return `${walletAddress}-${asset}`;
}

// Execute the trailing stop strategy
export async function executeTrailingStopStrategy(
  walletAddress: string,
  accountId: string,
  params: TrailingStopParams,
  policy: SaltPolicy | null
): Promise<StrategyExecutionResult> {
  const trailPct = params.trailPct ?? 3;
  const activationPct = params.activationPct ?? 2;

  console.log(`[TrailingStop] Running for wallet ${walletAddress.slice(0, 10)}...`);
  console.log(`[TrailingStop] Trail: ${trailPct}%, Activation: ${activationPct}%`);

  try {
    const positions = await getPositions(walletAddress);

    if (positions.length === 0) {
      return {
        success: true,
        action: 'none',
        details: { message: 'No open positions' },
      };
    }

    console.log(`[TrailingStop] Found ${positions.length} open positions`);

    const closedPositions: { asset: string; reason: string; pnlPct: number }[] = [];
    const checkedPositions: { asset: string; pnlPct: number; peakPnl: number; stopLevel: number; action: string }[] = [];

    for (const position of positions) {
      const asset = position.coin;
      const isLong = parseFloat(position.szi) > 0;
      const pnlPct = parseFloat(position.returnOnEquity) * 100;
      const positionValue = Math.abs(parseFloat(position.positionValue));
      const leverage = position.leverage?.value || 1;
      const peakKey = getPeakKey(walletAddress, asset);

      // Get or initialize peak P&L
      let peakPnl = peakPrices.get(peakKey) ?? pnlPct;

      // Update peak if current is higher
      if (pnlPct > peakPnl) {
        peakPnl = pnlPct;
        peakPrices.set(peakKey, peakPnl);
        console.log(`[TrailingStop] ${asset} new peak: ${peakPnl.toFixed(2)}%`);
      }

      // Calculate stop level
      const stopLevel = peakPnl - trailPct;
      const isActivated = peakPnl >= activationPct;

      console.log(`[TrailingStop] ${asset}: ${pnlPct.toFixed(2)}% (peak: ${peakPnl.toFixed(2)}%, stop: ${stopLevel.toFixed(2)}%, activated: ${isActivated})`);

      let shouldClose = false;

      // Only close if trailing stop is activated AND current P&L drops below stop level
      if (isActivated && pnlPct <= stopLevel) {
        shouldClose = true;
        console.log(`[TrailingStop] ${asset} hit trailing stop!`);
      }

      if (shouldClose) {
        const closed = await closePosition(walletAddress, asset, positionValue, isLong, leverage);

        if (closed) {
          // Clear peak tracking after close
          peakPrices.delete(peakKey);
          closedPositions.push({
            asset,
            reason: `trailing_stop (peak: ${peakPnl.toFixed(2)}%, closed at: ${pnlPct.toFixed(2)}%)`,
            pnlPct,
          });
          checkedPositions.push({ asset, pnlPct, peakPnl, stopLevel, action: 'closed' });
        } else {
          checkedPositions.push({ asset, pnlPct, peakPnl, stopLevel, action: 'close_failed' });
        }
      } else {
        checkedPositions.push({
          asset,
          pnlPct,
          peakPnl,
          stopLevel,
          action: isActivated ? 'trailing' : 'not_activated',
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
          trailPct,
          activationPct,
          positions: checkedPositions,
        },
      };
    }

    return {
      success: true,
      action: 'none',
      details: {
        message: 'No positions hit trailing stop',
        checkedCount: positions.length,
        trailPct,
        activationPct,
        positions: checkedPositions,
      },
    };
  } catch (error: any) {
    console.error('[TrailingStop] Strategy error:', error);
    return {
      success: false,
      error: error?.message || 'Trailing stop strategy failed',
    };
  }
}
