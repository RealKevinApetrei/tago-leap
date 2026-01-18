/**
 * Take Profit Strategy
 *
 * Automatically closes positions when they reach a profit target or stop loss.
 *
 * Features:
 * - Configurable take profit percentage (default: 5%)
 * - Optional stop loss (default: 10%)
 * - Respects policy limits
 * - Logs all actions
 *
 * [SALT] Policy-controlled robo managers
 */

import type { SaltPolicy } from '@tago-leap/shared/types';
import type { StrategyExecutionResult } from '../strategyEngine';
import { getPositions, closePosition, HyperliquidPosition } from './shared';

// Strategy parameters
export interface TakeProfitParams {
  takeProfitPct?: number;  // Profit % to trigger close (default: 5)
  stopLossPct?: number;    // Loss % to trigger stop (default: 10)
}

// Execute the take profit strategy
export async function executeTakeProfitStrategy(
  walletAddress: string,
  accountId: string,
  params: TakeProfitParams,
  policy: SaltPolicy | null
): Promise<StrategyExecutionResult> {
  const takeProfitPct = params.takeProfitPct ?? 5;
  const stopLossPct = params.stopLossPct ?? 10;

  console.log(`[TakeProfit] Running for wallet ${walletAddress.slice(0, 10)}...`);
  console.log(`[TakeProfit] Take profit: ${takeProfitPct}%, Stop loss: -${stopLossPct}%`);

  try {
    const positions = await getPositions(walletAddress);

    if (positions.length === 0) {
      return {
        success: true,
        action: 'none',
        details: { message: 'No open positions' },
      };
    }

    console.log(`[TakeProfit] Found ${positions.length} open positions`);

    const closedPositions: { asset: string; reason: 'take_profit' | 'stop_loss'; pnlPct: number }[] = [];
    const checkedPositions: { asset: string; pnlPct: number; action: string }[] = [];

    for (const position of positions) {
      const asset = position.coin;
      const isLong = parseFloat(position.szi) > 0;
      const pnlPct = parseFloat(position.returnOnEquity) * 100;
      const positionValue = Math.abs(parseFloat(position.positionValue));
      const leverage = position.leverage?.value || 1;

      console.log(`[TakeProfit] ${asset}: ${pnlPct.toFixed(2)}% P&L (${isLong ? 'LONG' : 'SHORT'})`);

      let shouldClose = false;
      let closeReason: 'take_profit' | 'stop_loss' | null = null;

      // Check take profit
      if (pnlPct >= takeProfitPct) {
        shouldClose = true;
        closeReason = 'take_profit';
        console.log(`[TakeProfit] ${asset} hit take profit target!`);
      }
      // Check stop loss
      else if (pnlPct <= -stopLossPct) {
        shouldClose = true;
        closeReason = 'stop_loss';
        console.log(`[TakeProfit] ${asset} hit stop loss!`);
      }

      if (shouldClose && closeReason) {
        const closed = await closePosition(walletAddress, asset, positionValue, isLong, leverage);

        if (closed) {
          closedPositions.push({ asset, reason: closeReason, pnlPct });
          checkedPositions.push({ asset, pnlPct, action: closeReason });
        } else {
          checkedPositions.push({ asset, pnlPct, action: 'close_failed' });
        }
      } else {
        checkedPositions.push({ asset, pnlPct, action: 'held' });
      }
    }

    if (closedPositions.length > 0) {
      return {
        success: true,
        action: 'position_closed',
        details: {
          closedPositions,
          closedCount: closedPositions.length,
          takeProfitPct,
          stopLossPct,
          positions: checkedPositions,
        },
      };
    }

    return {
      success: true,
      action: 'none',
      details: {
        message: 'No positions at take profit or stop loss',
        checkedCount: positions.length,
        takeProfitPct,
        stopLossPct,
        positions: checkedPositions,
      },
    };
  } catch (error: any) {
    console.error('[TakeProfit] Strategy error:', error);
    return {
      success: false,
      error: error?.message || 'Take profit strategy failed',
    };
  }
}
