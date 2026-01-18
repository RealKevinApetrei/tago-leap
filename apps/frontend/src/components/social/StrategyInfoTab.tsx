'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ratio?: number;
  startRatio?: number;
  endRatio?: number;
  longWeights?: number[];
  shortWeights?: number[];
  statistics?: PairStatistics;
}

interface StrategyInfoTabProps {
  suggestion: NarrativeSuggestion | null;
  todayNotional?: number;
  maxDailyNotional?: number;
  accountHealth?: number;
  availableBalance?: number;
  maxLeverage?: number;
  onUseBetaRatio?: (longWeight: number, shortWeight: number) => void;
}

// Animation variants
const panelVariants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2 }
    }
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.3, delay: 0.1 }
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
};

const progressVariants = {
  hidden: { scaleX: 0 },
  visible: (width: number) => ({
    scaleX: 1,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1],
      delay: 0.3,
    },
  }),
};

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

  const longAssets = suggestion?.longAssets?.filter(a => a.weight > 0) || [];
  const shortAssets = suggestion?.shortAssets?.filter(a => a.weight > 0) || [];
  const hasAssets = longAssets.length > 0 || shortAssets.length > 0;

  const assetsKey = useMemo(() => {
    const longKey = longAssets.map(a => `${a.asset}:${a.weight.toFixed(2)}`).join(',');
    const shortKey = shortAssets.map(a => `${a.asset}:${a.weight.toFixed(2)}`).join(',');
    return `${longKey}|${shortKey}`;
  }, [longAssets, shortAssets]);

  useEffect(() => {
    if (!hasAssets) {
      setBacktestData(null);
      return;
    }

    const fetchBacktest = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/pear/narratives/custom/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            longAssets: longAssets.map(a => ({ asset: a.asset, weight: a.weight })),
            shortAssets: shortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
            days: 30,
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

  const metrics = useMemo(() => {
    if (!backtestData?.dataPoints?.length) {
      return { winRate: 0, totalPnL: 0, tradesSimulated: 0, sharpeRatio: 0 };
    }

    const points = backtestData.dataPoints;
    const dailyReturns: number[] = [];
    for (let i = 1; i < points.length; i++) {
      dailyReturns.push(points[i].performance - points[i - 1].performance);
    }

    const winningDays = dailyReturns.filter(r => r > 0).length;
    const winRate = dailyReturns.length > 0 ? (winningDays / dailyReturns.length) * 100 : 0;
    const basePnL = 1000;
    const totalPnL = basePnL * (backtestData.totalReturn / 100);
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;

    return { winRate, totalPnL, tradesSimulated: dailyReturns.length, sharpeRatio };
  }, [backtestData]);

  const dailyUsagePercent = maxDailyNotional > 0 ? (todayNotional / maxDailyNotional) * 100 : 0;
  const riskLevel = dailyUsagePercent >= 90 ? 'high' : dailyUsagePercent >= 70 ? 'medium' : 'low';
  const healthStatus = accountHealth < 50 ? 'critical' : accountHealth < 80 ? 'warning' : 'healthy';

  const { sparklinePath, sparklineFillPath, isPositive } = useMemo(() => {
    const width = 200;
    const height = 40;
    const padding = 4;

    if (!backtestData?.dataPoints?.length) {
      return { sparklinePath: '', sparklineFillPath: '', isPositive: true };
    }

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

  const getTradeDescription = () => {
    const longStr = longAssets.map(a => a.asset).join('+');
    const shortStr = shortAssets.map(a => a.asset).join('+');

    if (longStr && shortStr) return `${longStr} vs ${shortStr}`;
    if (longStr) return `Long ${longStr}`;
    if (shortStr) return `Short ${shortStr}`;
    return 'No trade selected';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Tab Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-center gap-2 py-2.5 px-4
          border-b border-white/[0.06] transition-colors
          ${isExpanded ? 'bg-white/[0.05]' : 'bg-transparent hover:bg-white/[0.03]'}
        `}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        whileTap={{ scale: 0.995 }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 360 : 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChartIcon className="w-4 h-4 text-white/50" />
        </motion.div>
        <span className="text-xs font-medium text-white/60">Strategy Info</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronIcon className="w-4 h-4 text-white/40" />
        </motion.div>

        {/* Quick stats badges when collapsed */}
        <AnimatePresence>
          {!isExpanded && hasAssets && backtestData && (
            <motion.div
              className="flex items-center gap-3 ml-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <motion.span
                className={`text-xs ${backtestData.totalReturn >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {backtestData.totalReturn >= 0 ? '+' : ''}{backtestData.totalReturn.toFixed(1)}%
              </motion.span>
              {riskLevel !== 'low' && (
                <motion.span
                  className={`text-xs ${riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {riskLevel === 'high' ? '⚠ High Risk' : '⚡ Med Risk'}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Expanded Panel with slide animation */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
          >
            <motion.div
              className="p-4 bg-black/40 border-b border-white/[0.06]"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Historical Performance / Backtest */}
                <motion.div className="space-y-3" variants={itemVariants}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                      30-Day Backtest
                    </h3>
                    {hasAssets && (
                      <motion.span
                        className="text-[10px] text-white/40 px-2 py-0.5 bg-white/[0.05] rounded"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {getTradeDescription()}
                      </motion.span>
                    )}
                  </div>

                  {/* Sparkline Chart */}
                  <motion.div
                    className="relative h-12 bg-white/[0.02] rounded-lg overflow-hidden"
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    transition={{ duration: 0.2 }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <motion.div
                          className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
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
                          <motion.path
                            d={sparklineFillPath}
                            fill="url(#sparklineGradientLive)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          />
                          <motion.path
                            d={sparklinePath}
                            fill="none"
                            stroke={isPositive ? "#22c55e" : "#ef4444"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                          />
                        </svg>
                        <motion.div
                          className="absolute bottom-1 right-2 text-[10px] text-white/30"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                        >
                          Live backtest
                        </motion.div>
                      </>
                    )}
                  </motion.div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div
                      className="text-center p-2 rounded-lg bg-white/[0.03]"
                      variants={statCardVariants}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.p
                        className={`text-lg font-semibold ${backtestData && backtestData.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.4 }}
                      >
                        {backtestData ? `${backtestData.totalReturn >= 0 ? '+' : ''}${backtestData.totalReturn.toFixed(1)}%` : '--'}
                      </motion.p>
                      <p className="text-[10px] text-white/40">Return</p>
                    </motion.div>
                    <motion.div
                      className="text-center p-2 rounded-lg bg-white/[0.03]"
                      variants={statCardVariants}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.p
                        className="text-lg font-semibold text-red-400"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.5 }}
                      >
                        {backtestData ? `${backtestData.maxDrawdown.toFixed(1)}%` : '--'}
                      </motion.p>
                      <p className="text-[10px] text-white/40">Max DD</p>
                    </motion.div>
                  </div>

                  {/* Sharpe Ratio */}
                  <AnimatePresence>
                    {backtestData && (
                      <motion.div
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.03]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        transition={{ duration: 0.2, delay: 0.6 }}
                      >
                        <span className="text-white/50">Sharpe Ratio</span>
                        <motion.span
                          className={`font-medium ${metrics.sharpeRatio >= 1 ? 'text-green-400' : metrics.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, delay: 0.7 }}
                        >
                          {metrics.sharpeRatio.toFixed(2)}
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Risk Limits */}
                <motion.div className="space-y-3" variants={itemVariants}>
                  <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                    Risk Limits
                  </h3>

                  <div className="space-y-3">
                    {/* Daily Notional */}
                    <motion.div
                      className="space-y-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
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
                        <motion.div
                          className={`h-full origin-left ${
                            riskLevel === 'high' ? 'bg-red-500' :
                            riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: Math.min(dailyUsagePercent, 100) / 100 }}
                          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
                        />
                      </div>
                    </motion.div>

                    {/* Account Health */}
                    <motion.div
                      className="space-y-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
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
                        <motion.div
                          className={`h-full origin-left ${
                            healthStatus === 'critical' ? 'bg-red-500' :
                            healthStatus === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: accountHealth / 100 }}
                          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
                        />
                      </div>
                    </motion.div>

                    {/* Available Balance */}
                    <motion.div
                      className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', scale: 1.01 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="text-white/60">Available Balance</span>
                      <motion.span
                        className="font-medium text-white/90"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </motion.span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Pair Statistics / Trade Analysis */}
                <motion.div className="space-y-3" variants={itemVariants}>
                  <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                    {backtestData?.statistics ? 'Pair Statistics' : suggestion ? 'Trade Analysis' : 'Strategy Settings'}
                  </h3>

                  {/* Pair Statistics */}
                  {backtestData?.statistics ? (
                    <motion.div
                      className="space-y-2"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <StatRow
                        label="Correlation"
                        value={backtestData.statistics.correlation.toFixed(2)}
                        colorClass={
                          backtestData.statistics.correlation >= 0.7 ? 'text-green-400' :
                          backtestData.statistics.correlation >= 0.3 ? 'text-yellow-400' : 'text-red-400'
                        }
                        delay={0.1}
                      />
                      <StatRow
                        label="Cointegrated"
                        value={backtestData.statistics.cointegrated ? 'Yes' : 'No'}
                        colorClass={backtestData.statistics.cointegrated ? 'text-green-400' : 'text-white/50'}
                        delay={0.2}
                      />
                      <StatRow
                        label="Roll ZScore"
                        value={backtestData.statistics.rollingZScore.toFixed(2)}
                        colorClass={
                          Math.abs(backtestData.statistics.rollingZScore) >= 2 ? 'text-red-400' :
                          Math.abs(backtestData.statistics.rollingZScore) >= 1 ? 'text-yellow-400' : 'text-green-400'
                        }
                        delay={0.3}
                      />
                      <StatRow
                        label="Volatility"
                        value={`${backtestData.statistics.volatility}%`}
                        colorClass={
                          backtestData.statistics.volatility >= 80 ? 'text-red-400' :
                          backtestData.statistics.volatility >= 40 ? 'text-yellow-400' : 'text-green-400'
                        }
                        delay={0.4}
                      />

                      {/* Beta Card */}
                      <motion.div
                        className="p-2 rounded-lg bg-white/[0.03] space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">Beta</span>
                          <motion.span
                            className="text-sm font-semibold text-[#E8FF00]"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, delay: 0.6 }}
                          >
                            {backtestData.statistics.beta.toFixed(3)}
                          </motion.span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <motion.span
                            className="text-green-400"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                          >
                            {longAssets[0]?.asset}: {(backtestData.statistics.betaWeights.long * 100).toFixed(1)}%
                          </motion.span>
                          <span className="text-white/30">|</span>
                          <motion.span
                            className="text-red-400"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                          >
                            {shortAssets[0]?.asset}: {(backtestData.statistics.betaWeights.short * 100).toFixed(1)}%
                          </motion.span>
                        </div>
                      </motion.div>

                      {/* Use Beta Ratio button */}
                      {onUseBetaRatio && (
                        <motion.button
                          onClick={() => onUseBetaRatio(
                            backtestData.statistics!.betaWeights.long,
                            backtestData.statistics!.betaWeights.short
                          )}
                          className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-[#E8FF00]/10 text-[#E8FF00] border border-[#E8FF00]/30 flex items-center justify-center gap-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{
                            backgroundColor: 'rgba(232, 255, 0, 0.2)',
                            scale: 1.02,
                            boxShadow: '0 0 20px rgba(232, 255, 0, 0.2)'
                          }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ delay: 0.8 }}
                        >
                          <ScaleIcon className="w-3.5 h-3.5" />
                          Use Beta Ratio
                        </motion.button>
                      )}
                    </motion.div>
                  ) : suggestion ? (
                    <motion.div
                      className="space-y-2"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div
                        className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        variants={itemVariants}
                        whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                      >
                        <p className="text-xs text-white/70 line-clamp-3">
                          {suggestion.rationale || 'AI-generated trade based on narrative analysis'}
                        </p>
                      </motion.div>

                      {suggestion.confidence !== undefined && (
                        <motion.div
                          className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]"
                          variants={itemVariants}
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                          <span className="text-xs text-white/60">AI Confidence</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full origin-left ${
                                  suggestion.confidence >= 0.7 ? 'bg-green-400' :
                                  suggestion.confidence >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: suggestion.confidence }}
                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              suggestion.confidence >= 0.7 ? 'text-green-400' :
                              suggestion.confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {(suggestion.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {suggestion.suggestedLeverage && (
                        <motion.div
                          className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]"
                          variants={itemVariants}
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                          <span className="text-white/60">Suggested Leverage</span>
                          <span className="font-medium text-white/90">{suggestion.suggestedLeverage}x</span>
                        </motion.div>
                      )}

                      {suggestion.warnings && suggestion.warnings.length > 0 && (
                        <motion.div
                          className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                          variants={itemVariants}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <p className="text-[10px] text-yellow-400">
                            {suggestion.warnings[0]}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="space-y-2"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <SettingRow label="Max Leverage" value={`${maxLeverage}x`} delay={0.1} />
                      <SettingRow label="Max Daily Notional" value={`$${maxDailyNotional.toLocaleString()}`} delay={0.2} />
                      <SettingRow label="Slippage Tolerance" value="1%" delay={0.3} />
                      <SettingRow label="Execution" value="Market" delay={0.4} />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ label, value, colorClass, delay = 0 }: { label: string; value: string; colorClass: string; delay?: number }) {
  return (
    <motion.div
      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', x: 2 }}
      transition={{ delay }}
    >
      <span className="text-xs text-white/60">{label}</span>
      <motion.span
        className={`text-sm font-semibold ${colorClass}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, delay: delay + 0.1 }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

function SettingRow({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <motion.div
      className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      transition={{ delay }}
    >
      <span className="text-white/60">{label}</span>
      <span className="font-medium text-white/90">{value}</span>
    </motion.div>
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
