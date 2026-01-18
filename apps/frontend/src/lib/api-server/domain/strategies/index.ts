/**
 * Strategy Exports
 *
 * All implemented robo strategies for SALT compliance.
 */

export { executeTakeProfitStrategy, type TakeProfitParams } from './takeProfit';
export { executeTrailingStopStrategy, type TrailingStopParams } from './trailingStop';
export { executeVWAPExitStrategy, type VWAPExitParams } from './vwapExit';
export { executeADXMomentumStrategy, type ADXMomentumParams } from './adxMomentum';
export {
  getPositions,
  getCandles,
  closePosition,
  calculateVWAP,
  calculateADX,
  type HyperliquidPosition,
  type HyperliquidCandle,
} from './shared';
