'use client';

import { useState, useEffect, useMemo } from 'react';
import type { NarrativeSuggestion } from '@/lib/api';

interface PerformanceDataPoint {
  timestamp: number;
  date: string;
  longPrice: number;
  shortPrice: number;
  performance: number;
}

interface PairStatistics {
  correlation: number;
  cointegrated: boolean;
  rollingZScore: number;
  volatility: number;
  beta: number;
  betaWeights: {
    long: number;
    short: number;
  };
}

interface BacktestData {
  dataPoints: PerformanceDataPoint[];
  totalReturn: number;
  maxDrawdown: number;
  ratio?: number;          // Current price ratio
  startRatio?: number;     // Starting price ratio
  endRatio?: number;       // Ending price ratio
  longWeights?: number[];  // Weights used for long basket
  shortWeights?: number[]; // Weights used for short basket
  statistics?: PairStatistics;
}

interface StrategyInfoTabProps {
  suggestion: NarrativeSuggestion | null;
  todayNotional?: number;
  maxDailyNotional?: number;
  accountHealth?: number;
  availableBalance?: number;
  maxLeverage?: number;
  /** Callback when user clicks "Use Beta Ratio" to adjust weights */
  onUseBetaRatio?: (longWeight: number, shortWeight: number) => void;
}

export function StrategyInfoTab({
  suggestion,
  todayNotional = 0,
  maxDailyNotional = 100000,
  accountHealth = 100,
  availableBalance = 0,
  maxLeverage = 20,
  onUseBetaRatio,
}: StrategyInfoTabProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [backtestData, setBacktestData] = useState<BacktestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract assets from suggestion (with weights for baskets)
  const longAssets = suggestion?.longAssets?.filter(a => a.weight > 0) || [];
  const shortAssets = suggestion?.shortAssets?.filter(a => a.weight > 0) || [];
  const hasAssets = longAssets.length > 0 || shortAssets.length > 0;

  // Create a stable key for the assets to trigger refetch when they change
  const assetsKey = useMemo(() => {
    const longKey = longAssets.map(a => `${a.asset}:${a.weight.toFixed(2)}`).join(',');
    const shortKey = shortAssets.map(a => `${a.asset}:${a.weight.toFixed(2)}`).join(',');
    return `${longKey}|${shortKey}`;
  }, [longAssets, shortAssets]);

  // Fetch live backtest data when suggestion changes
  useEffect(() => {
    if (!hasAssets) {
      setBacktestData(null);
      return;
    }

    const fetchBacktest = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use POST for full basket data with weights
        const response = await fetch('/api/pear/narratives/custom/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            longAssets: longAssets.map(a => ({ asset: a.asset, weight: a.weight })),
            shortAssets: shortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
            days: 30, // 30 day backtest
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to fetch backtest data');
        }

        setBacktestData(result.data);
      } catch (err) {
        console.error('[StrategyInfoTab] Backtest error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load backtest');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBacktest();
  }, [assetsKey, hasAssets]);

  // Calculate metrics from backtest data
  const metrics = useMemo(() => {
    if (!backtestData?.dataPoints?.length) {
      return {
        winRate: 0,
        totalPnL: 0,
        tradesSimulated: 0,
        sharpeRatio: 0,
      };
    }

    const points = backtestData.dataPoints;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const dailyReturn = points[i].performance - points[i - 1].performance;
      dailyReturns.push(dailyReturn);
    }

    // Win rate: percentage of positive days
    const winningDays = dailyReturns.filter(r => r > 0).length;
    const winRate = dailyReturns.length > 0 ? (winningDays / dailyReturns.length) * 100 : 0;

    // Simulated P&L (assuming $1000 base)
    const basePnL = 1000;
    const totalPnL = basePnL * (backtestData.totalReturn / 100);

    // Sharpe ratio approximation (annualized)
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;

    return {
      winRate,
      totalPnL,
      tradesSimulated: dailyReturns.length,
      sharpeRatio,
    };
  }, [backtestData]);

  // Risk calculations
  const dailyUsagePercent = maxDailyNotional > 0 ? (todayNotional / maxDailyNotional) * 100 : 0;
  const riskLevel = dailyUsagePercent >= 90 ? 'high' : dailyUsagePercent >= 70 ? 'medium' : 'low';
  const healthStatus = accountHealth < 50 ? 'critical' : accountHealth < 80 ? 'warning' : 'healthy';

  // Generate sparkline path from live data
  const { sparklinePath, sparklineFillPath, isPositive } = useMemo(() => {
    const width = 200;
    const height = 40;
    const padding = 4;

    if (!backtestData?.dataPoints?.length) {
      return { sparklinePath: '', sparklineFillPath: '', isPositive: true };
    }

    // Sample data points for smoother display
    const points = backtestData.dataPoints;
    const sampleRate = Math.max(1, Math.floor(points.length / 30));
    const sampledPoints = points.filter((_, i) => i % sampleRate === 0 || i === points.length - 1);

    const values = sampledPoints.map(d => d.performance);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const range = maxVal - minVal || 1;

    const pathPoints = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const path = `M${pathPoints.join(' L')}`;
    const fillPath = `M${padding},${height} L${pathPoints.join(' L')} L${width - padding},${height} Z`;
    const positive = values[values.length - 1] >= 0;

    return { sparklinePath: path, sparklineFillPath: fillPath, isPositive: positive };
  }, [backtestData]);

  // Get trade description (shows full basket if multiple assets)
  const getTradeDescription = () => {
    const longStr = longAssets.map(a => a.asset).join('+');
    const shortStr = shortAssets.map(a => a.asset).join('+');

    if (longStr && shortStr) return `${longStr} vs ${shortStr}`;
    if (longStr) return `Long ${longStr}`;
    if (shortStr) return `Short ${shortStr}`;
    return 'No trade selected';
  };

  return (
    <div className="relative">
      {/* Tab Button - Always visible at top */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-center gap-2 py-2 px-4
          border-b border-white/[0.06] transition-all
          ${isExpanded ? 'bg-white/[0.05]' : 'bg-transparent hover:bg-white/[0.03]'}
        `}
      >
        <ChartIcon className="w-4 h-4 text-white/50" />
        <span className="text-xs font-medium text-white/60">Strategy Info</span>
        <ChevronIcon
          className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />

        {/* Quick stats badges when collapsed */}
        {!isExpanded && hasAssets && backtestData && (
          <div className="flex items-center gap-3 ml-4">
            <span className={`text-xs ${backtestData.totalReturn >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {backtestData.totalReturn >= 0 ? '+' : ''}{backtestData.totalReturn.toFixed(1)}%
            </span>
            {riskLevel !== 'low' && (
              <span className={`text-xs ${riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                {riskLevel === 'high' ? '⚠ High Risk' : '⚡ Med Risk'}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="p-4 bg-black/40 border-b border-white/[0.06]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Historical Performance / Backtest */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                  30-Day Backtest
                </h3>
                {hasAssets && (
                  <span className="text-[10px] text-white/40 px-2 py-0.5 bg-white/[0.05] rounded">
                    {getTradeDescription()}
                  </span>
                )}
              </div>

              {/* Sparkline Chart */}
              <div className="relative h-12 bg-white/[0.02] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-white/30">{error}</span>
                  </div>
                ) : !hasAssets ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-white/30">Select a trade to see backtest</span>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparklineGradientLive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={sparklineFillPath} fill="url(#sparklineGradientLive)" />
                      <path
                        d={sparklinePath}
                        fill="none"
                        stroke={isPositive ? "#22c55e" : "#ef4444"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="absolute bottom-1 right-2 text-[10px] text-white/30">
                      Live backtest
                    </div>
                  </>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className={`text-lg font-semibold ${backtestData && backtestData.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {backtestData ? `${backtestData.totalReturn >= 0 ? '+' : ''}${backtestData.totalReturn.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-[10px] text-white/40">Return</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-lg font-semibold text-red-400">
                    {backtestData ? `${backtestData.maxDrawdown.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-[10px] text-white/40">Max DD</p>
                </div>
              </div>

              {/* Extra metrics */}
              {backtestData && (
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
                  <span className="text-white/50">Sharpe Ratio</span>
                  <span className={`font-medium ${metrics.sharpeRatio >= 1 ? 'text-green-400' : metrics.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {metrics.sharpeRatio.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Risk Limits */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                Risk Limits
              </h3>

              <div className="space-y-3">
                {/* Daily Notional */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Daily Notional</span>
                    <span className={`font-medium ${
                      riskLevel === 'high' ? 'text-red-400' :
                      riskLevel === 'medium' ? 'text-yellow-400' : 'text-white/80'
                    }`}>
                      ${todayNotional.toLocaleString()} / ${maxDailyNotional.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        riskLevel === 'high' ? 'bg-red-500' :
                        riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Account Health */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Account Health</span>
                    <span className={`font-medium ${
                      healthStatus === 'critical' ? 'text-red-400' :
                      healthStatus === 'warning' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {accountHealth.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        healthStatus === 'critical' ? 'bg-red-500' :
                        healthStatus === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${accountHealth}%` }}
                    />
                  </div>
                </div>

                {/* Available Balance */}
                <div className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
                  <span className="text-white/60">Available Balance</span>
                  <span className="font-medium text-white/90">
                    ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Pair Statistics / Trade Analysis */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                {backtestData?.statistics ? 'Pair Statistics' : suggestion ? 'Trade Analysis' : 'Strategy Settings'}
              </h3>

              {/* Show pair statistics when available (Agent Pear style) */}
              {backtestData?.statistics ? (
                <div className="space-y-2">
                  {/* Correlation */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-white/60">Correlation</span>
                    <span className={`text-sm font-semibold ${
                      backtestData.statistics.correlation >= 0.7 ? 'text-green-400' :
                      backtestData.statistics.correlation >= 0.3 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {backtestData.statistics.correlation.toFixed(2)}
                    </span>
                  </div>

                  {/* Cointegrated */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-white/60">Cointegrated</span>
                    <span className={`text-sm font-semibold ${
                      backtestData.statistics.cointegrated ? 'text-green-400' : 'text-white/50'
                    }`}>
                      {backtestData.statistics.cointegrated ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* Rolling Z-Score */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-white/60">Roll ZScore</span>
                    <span className={`text-sm font-semibold ${
                      Math.abs(backtestData.statistics.rollingZScore) >= 2 ? 'text-red-400' :
                      Math.abs(backtestData.statistics.rollingZScore) >= 1 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {backtestData.statistics.rollingZScore.toFixed(2)}
                    </span>
                  </div>

                  {/* Volatility */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-white/60">Volatility</span>
                    <span className={`text-sm font-semibold ${
                      backtestData.statistics.volatility >= 80 ? 'text-red-400' :
                      backtestData.statistics.volatility >= 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {backtestData.statistics.volatility}%
                    </span>
                  </div>

                  {/* Beta with asset breakdown */}
                  <div className="p-2 rounded-lg bg-white/[0.03] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">Beta</span>
                      <span className="text-sm font-semibold text-[#E8FF00]">
                        {backtestData.statistics.beta.toFixed(3)}
                      </span>
                    </div>
                    {/* Beta weights breakdown */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-green-400">
                        {longAssets[0]?.asset}: {(backtestData.statistics.betaWeights.long * 100).toFixed(1)}%
                      </span>
                      <span className="text-white/30">|</span>
                      <span className="text-red-400">
                        {shortAssets[0]?.asset}: {(backtestData.statistics.betaWeights.short * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Use Beta Ratio button */}
                  {onUseBetaRatio && (
                    <button
                      onClick={() => onUseBetaRatio(
                        backtestData.statistics!.betaWeights.long,
                        backtestData.statistics!.betaWeights.short
                      )}
                      className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-[#E8FF00]/10 text-[#E8FF00] border border-[#E8FF00]/30 hover:bg-[#E8FF00]/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <ScaleIcon className="w-3.5 h-3.5" />
                      Use Beta Ratio
                    </button>
                  )}
                </div>
              ) : suggestion ? (
                <div className="space-y-2">
                  {/* Current trade reasoning */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/70 line-clamp-3">
                      {suggestion.rationale || 'AI-generated trade based on narrative analysis'}
                    </p>
                  </div>

                  {/* Trade confidence */}
                  {suggestion.confidence !== undefined && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                      <span className="text-xs text-white/60">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              suggestion.confidence >= 0.7 ? 'bg-green-400' :
                              suggestion.confidence >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          suggestion.confidence >= 0.7 ? 'text-green-400' :
                          suggestion.confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Suggested leverage */}
                  {suggestion.suggestedLeverage && (
                    <div className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
                      <span className="text-white/60">Suggested Leverage</span>
                      <span className="font-medium text-white/90">{suggestion.suggestedLeverage}x</span>
                    </div>
                  )}

                  {/* Warnings */}
                  {suggestion.warnings && suggestion.warnings.length > 0 && (
                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-[10px] text-yellow-400">
                        {suggestion.warnings[0]}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <SettingRow label="Max Leverage" value={`${maxLeverage}x`} />
                  <SettingRow label="Max Daily Notional" value={`$${maxDailyNotional.toLocaleString()}`} />
                  <SettingRow label="Slippage Tolerance" value="1%" />
                  <SettingRow label="Execution" value="Market" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
      <span className="text-white/60">{label}</span>
      <span className="font-medium text-white/90">{value}</span>
    </div>
  );
}

// Icons
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}
