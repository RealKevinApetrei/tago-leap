/**
 * Risk Calculator - Hedge fund style risk metrics
 *
 * Calculates various risk metrics for portfolio management:
 * - Drawdown tracking
 * - Liquidation distance
 * - Sector concentration
 * - Position sizing analysis
 */

import { calculateSectorConcentration, getLargestSectorConcentration, type AssetCategory } from './assetCategories';

export interface PositionData {
  asset: string;
  size: number;           // Position size in asset units
  entryPrice: number;
  currentPrice: number;
  notional: number;       // Position value in USD
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number | null;
  isLong: boolean;
}

export interface RiskMetrics {
  // Drawdown
  currentDrawdownPct: number;
  peakEquity: number;

  // Liquidation
  nearestLiquidationPct: number;
  weightedLiquidationDistance: number;

  // Concentration
  largestPositionPct: number;
  sectorConcentration: Record<AssetCategory, number>;
  largestSector: { sector: AssetCategory; percentage: number };

  // Position metrics
  totalNotional: number;
  positionCount: number;
  avgLeverage: number;

  // P&L
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
}

export interface DrawdownUpdate {
  peakEquity: number;
  currentDrawdownPct: number;
}

/**
 * Calculate drawdown from peak equity
 */
export function calculateDrawdown(
  currentEquity: number,
  peakEquity: number
): DrawdownUpdate {
  // Update peak if current equity is higher
  const newPeak = Math.max(peakEquity, currentEquity);

  // Calculate drawdown percentage
  const drawdown = newPeak > 0 ? ((newPeak - currentEquity) / newPeak) * 100 : 0;

  return {
    peakEquity: newPeak,
    currentDrawdownPct: Math.max(0, drawdown), // Ensure non-negative
  };
}

/**
 * Calculate liquidation distance for a single position
 * Returns percentage distance from current price to liquidation
 */
export function calculateLiquidationDistance(
  currentPrice: number,
  liquidationPrice: number | null,
  isLong: boolean
): number {
  if (liquidationPrice === null || liquidationPrice <= 0) {
    return 100; // No liquidation risk (e.g., spot position)
  }

  if (isLong) {
    // For longs, liquidation is below current price
    if (currentPrice <= liquidationPrice) return 0;
    return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  } else {
    // For shorts, liquidation is above current price
    if (currentPrice >= liquidationPrice) return 0;
    return ((liquidationPrice - currentPrice) / currentPrice) * 100;
  }
}

/**
 * Calculate weighted average liquidation distance across all positions
 */
export function calculateWeightedLiquidationDistance(positions: PositionData[]): number {
  if (positions.length === 0) return 100;

  let totalNotional = 0;
  let weightedSum = 0;

  for (const pos of positions) {
    const absNotional = Math.abs(pos.notional);
    const distance = calculateLiquidationDistance(
      pos.currentPrice,
      pos.liquidationPrice,
      pos.isLong
    );

    weightedSum += distance * absNotional;
    totalNotional += absNotional;
  }

  return totalNotional > 0 ? weightedSum / totalNotional : 100;
}

/**
 * Find the position closest to liquidation
 */
export function findNearestLiquidation(positions: PositionData[]): number {
  if (positions.length === 0) return 100;

  let minDistance = 100;

  for (const pos of positions) {
    const distance = calculateLiquidationDistance(
      pos.currentPrice,
      pos.liquidationPrice,
      pos.isLong
    );
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Calculate all risk metrics for a portfolio
 */
export function calculateRiskMetrics(
  positions: PositionData[],
  currentEquity: number,
  peakEquity: number
): RiskMetrics {
  // Calculate drawdown
  const drawdownUpdate = calculateDrawdown(currentEquity, peakEquity);

  // Position analysis
  const totalNotional = positions.reduce((sum, p) => sum + Math.abs(p.notional), 0);
  const positionCount = positions.length;

  // Calculate largest position percentage
  let largestPositionPct = 0;
  if (totalNotional > 0) {
    const maxPositionNotional = Math.max(...positions.map(p => Math.abs(p.notional)), 0);
    largestPositionPct = (maxPositionNotional / totalNotional) * 100;
  }

  // Calculate average leverage
  let avgLeverage = 0;
  if (positions.length > 0) {
    const totalLeverage = positions.reduce((sum, p) => sum + p.leverage * Math.abs(p.notional), 0);
    avgLeverage = totalNotional > 0 ? totalLeverage / totalNotional : 0;
  }

  // Calculate sector concentration
  const positionsForConcentration = positions.map(p => ({
    asset: p.asset,
    notional: p.notional,
  }));
  const sectorConcentration = calculateSectorConcentration(positionsForConcentration);
  const largestSector = getLargestSectorConcentration(sectorConcentration);

  // Liquidation metrics
  const nearestLiquidationPct = findNearestLiquidation(positions);
  const weightedLiquidationDistance = calculateWeightedLiquidationDistance(positions);

  // P&L
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const costBasis = currentEquity - totalUnrealizedPnl;
  const totalUnrealizedPnlPct = costBasis > 0 ? (totalUnrealizedPnl / costBasis) * 100 : 0;

  return {
    currentDrawdownPct: drawdownUpdate.currentDrawdownPct,
    peakEquity: drawdownUpdate.peakEquity,
    nearestLiquidationPct,
    weightedLiquidationDistance,
    largestPositionPct,
    sectorConcentration,
    largestSector,
    totalNotional,
    positionCount,
    avgLeverage,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct,
  };
}

/**
 * Risk tier determination for tiered responses
 */
export type RiskTier = 'none' | 'info' | 'warning' | 'action' | 'partial' | 'full';

export interface RiskAction {
  tier: RiskTier;
  action: 'monitor' | 'log' | 'notify' | 'alert_rebalance' | 'close_50_pct' | 'close_all';
  reason?: string;
}

export interface PolicyThresholds {
  maxDrawdownPct: number;
  warningDrawdownPct?: number;
  rebalanceDrawdownPct?: number;
  partialCloseDrawdownPct?: number;
  minLiquidationDistancePct?: number;
  maxSectorConcentrationPct?: number;
  autoCloseEnabled?: boolean;
  autoPartialCloseEnabled?: boolean;
}

/**
 * Determine the appropriate risk action based on metrics and policy
 */
export function determineRiskAction(
  metrics: RiskMetrics,
  policy: PolicyThresholds
): RiskAction {
  const {
    maxDrawdownPct,
    warningDrawdownPct = maxDrawdownPct * 0.5,
    rebalanceDrawdownPct = maxDrawdownPct * 0.9,
    partialCloseDrawdownPct = maxDrawdownPct,
    minLiquidationDistancePct = 10,
    autoCloseEnabled = false,
    autoPartialCloseEnabled = false,
  } = policy;

  // Check drawdown tiers (highest priority)
  const drawdownRatio = metrics.currentDrawdownPct / maxDrawdownPct;

  if (drawdownRatio >= 1.2 && autoCloseEnabled) {
    return {
      tier: 'full',
      action: 'close_all',
      reason: `Drawdown ${metrics.currentDrawdownPct.toFixed(1)}% exceeds 120% of limit`,
    };
  }

  if (drawdownRatio >= 1.0 && autoPartialCloseEnabled) {
    return {
      tier: 'partial',
      action: 'close_50_pct',
      reason: `Drawdown ${metrics.currentDrawdownPct.toFixed(1)}% exceeds limit`,
    };
  }

  if (drawdownRatio >= 0.9) {
    return {
      tier: 'action',
      action: 'alert_rebalance',
      reason: `Drawdown ${metrics.currentDrawdownPct.toFixed(1)}% approaching limit`,
    };
  }

  // Check liquidation distance
  if (metrics.nearestLiquidationPct < minLiquidationDistancePct) {
    return {
      tier: 'action',
      action: 'alert_rebalance',
      reason: `Liquidation distance ${metrics.nearestLiquidationPct.toFixed(1)}% below minimum`,
    };
  }

  if (drawdownRatio >= 0.75) {
    return {
      tier: 'warning',
      action: 'notify',
      reason: `Drawdown ${metrics.currentDrawdownPct.toFixed(1)}% at warning level`,
    };
  }

  if (drawdownRatio >= 0.5) {
    return {
      tier: 'info',
      action: 'log',
      reason: `Drawdown ${metrics.currentDrawdownPct.toFixed(1)}% tracked`,
    };
  }

  return { tier: 'none', action: 'monitor' };
}

/**
 * Format risk metrics for display
 */
export function formatRiskMetricsForDisplay(metrics: RiskMetrics): Record<string, string> {
  return {
    drawdown: `${metrics.currentDrawdownPct.toFixed(1)}%`,
    liquidationDistance: `${metrics.nearestLiquidationPct.toFixed(1)}%`,
    largestPosition: `${metrics.largestPositionPct.toFixed(0)}%`,
    topSector: `${metrics.largestSector.sector} (${metrics.largestSector.percentage.toFixed(0)}%)`,
    avgLeverage: `${metrics.avgLeverage.toFixed(1)}x`,
    totalNotional: `$${metrics.totalNotional.toLocaleString()}`,
    unrealizedPnl: `${metrics.totalUnrealizedPnl >= 0 ? '+' : ''}$${metrics.totalUnrealizedPnl.toFixed(2)}`,
  };
}
