'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
} as const;

const cardHoverVariants = {
  rest: { scale: 1, boxShadow: '0 0 0 rgba(232, 255, 0, 0)' },
  hover: {
    scale: 1.02,
    boxShadow: '0 4px 20px rgba(232, 255, 0, 0.1)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
} as const;

// Helper to format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper to explain what each strategy does with its params
function getStrategyExplanation(strategyId: string, params?: Record<string, unknown>): string {
  switch (strategyId) {
    case 'take-profit': {
      const tp = (params?.takeProfitPct as number) ?? 5;
      const sl = (params?.stopLossPct as number) ?? 10;
      return `Closes at +${tp}% profit or -${sl}% stop loss`;
    }
    case 'trailing-stop': {
      const trail = (params?.trailPct as number) ?? 3;
      const activation = (params?.activationPct as number) ?? 2;
      return `After +${activation}% profit, trails ${trail}% below peak`;
    }
    case 'vwap-exit': {
      const minProfit = (params?.minProfitPct as number) ?? 1;
      return `Exits when price crosses VWAP (min ${minProfit}% profit)`;
    }
    case 'adx-momentum': {
      const adxThreshold = (params?.adxThreshold as number) ?? 25;
      const minProfit = (params?.minProfitPct as number) ?? 2;
      return `Exits when ADX < ${adxThreshold} (min ${minProfit}% profit)`;
    }
    default:
      return 'Automated trading strategy';
  }
}

// Strategy types
interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'standard' | 'degen';
}

interface UserStrategy {
  id: string;
  strategy_id: string;
  params: Record<string, unknown>;
  active: boolean;
}

interface StrategyRun {
  id: string;
  strategy_id: string;
  strategy_definition_id: string; // The strategy type (e.g., "take-profit")
  status: 'running' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

interface RiskManagementTabProps {
  maxLeverage: string;
  setMaxLeverage: (value: string) => void;
  maxDailyNotional: string;
  setMaxDailyNotional: (value: string) => void;
  maxDrawdown: string;
  setMaxDrawdown: (value: string) => void;
  autoCloseEnabled?: boolean;
  setAutoCloseEnabled?: (value: boolean) => void;
  savingPolicy: boolean;
  onSavePolicy: (tokens: string[]) => Promise<void>;
  showToast: (type: 'error' | 'success', message: string) => void;
  allowedTokens: string[];
  // Hedge fund metrics
  todayNotional?: number;
  remainingNotional?: number;
  currentDrawdown?: number;
  unrealizedPnl?: number;
  accountHealth?: number;
  winRate?: number;
  totalTrades?: number;
  // Strategy props
  availableStrategies?: StrategyDefinition[];
  userStrategies?: UserStrategy[];
  recentRuns?: StrategyRun[];
  isTogglingStrategy?: boolean;
  onToggleStrategy?: (strategyId: string, active: boolean, params?: Record<string, unknown>) => Promise<void>;
}

// Default params for each strategy
const DEFAULT_STRATEGY_PARAMS: Record<string, Record<string, { label: string; value: number; min: number; max: number; step: number; suffix: string }>> = {
  'take-profit': {
    takeProfitPct: { label: 'Take Profit', value: 5, min: 1, max: 50, step: 1, suffix: '%' },
    stopLossPct: { label: 'Stop Loss', value: 10, min: 1, max: 50, step: 1, suffix: '%' },
  },
  'trailing-stop': {
    activationPct: { label: 'Activation', value: 2, min: 0.5, max: 20, step: 0.5, suffix: '%' },
    trailPct: { label: 'Trail Distance', value: 3, min: 0.5, max: 20, step: 0.5, suffix: '%' },
  },
  'vwap-exit': {
    minProfitPct: { label: 'Min Profit', value: 1, min: 0, max: 20, step: 0.5, suffix: '%' },
  },
  'adx-momentum': {
    adxThreshold: { label: 'ADX Threshold', value: 25, min: 10, max: 50, step: 1, suffix: '' },
    minProfitPct: { label: 'Min Profit', value: 2, min: 0, max: 20, step: 0.5, suffix: '%' },
  },
};

// Editable stat card component
function EditableStatCard({
  label,
  value,
  suffix,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(tempValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(tempValue);
    } else {
      setTempValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:border-tago-yellow-400/30 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-[10px] text-white/40 uppercase tracking-wide">{label}</span>
      {isEditing ? (
        <input
          type="number"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          autoFocus
          className="w-full bg-transparent text-lg font-semibold text-white outline-none border-b border-tago-yellow-400"
        />
      ) : (
        <p className="text-lg font-semibold text-white">
          {value}{suffix}
        </p>
      )}
    </div>
  );
}

// Progress gauge component
function ProgressGauge({
  label,
  current,
  max,
  unit = '',
  warningThreshold = 0.8,
  dangerThreshold = 0.95,
}: {
  label: string;
  current: number;
  max: number;
  unit?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}) {
  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const ratio = max > 0 ? current / max : 0;

  const getColor = () => {
    if (ratio >= dangerThreshold) return 'bg-red-500';
    if (ratio >= warningThreshold) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (ratio >= dangerThreshold) return 'text-red-400';
    if (ratio >= warningThreshold) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className={getTextColor()}>
          {unit === '$' ? `$${current.toLocaleString()}` : current.toFixed(1)}{unit !== '$' ? unit : ''} / {unit === '$' ? `$${max.toLocaleString()}` : max}{unit !== '$' ? unit : ''}
        </span>
      </div>
      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Metric card component
function MetricCard({
  label,
  value,
  subValue,
  positive,
}: {
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {value}
        </span>
        {subValue && <span className="text-[10px] text-white/40 ml-1">{subValue}</span>}
      </div>
    </div>
  );
}

export function RiskManagementTab({
  maxLeverage,
  setMaxLeverage,
  maxDailyNotional,
  setMaxDailyNotional,
  maxDrawdown,
  setMaxDrawdown,
  autoCloseEnabled = false,
  setAutoCloseEnabled,
  savingPolicy,
  onSavePolicy,
  showToast,
  allowedTokens,
  todayNotional = 0,
  remainingNotional = 0,
  currentDrawdown = 0,
  unrealizedPnl = 0,
  accountHealth,
  winRate,
  totalTrades = 0,
  // Strategy props
  availableStrategies = [],
  userStrategies = [],
  recentRuns = [],
  isTogglingStrategy = false,
  onToggleStrategy,
}: RiskManagementTabProps) {
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set(allowedTokens));
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [editedParams, setEditedParams] = useState<Record<string, Record<string, number>>>({});

  const { assets: allTokens, categories: tokenCategories, isLoading: assetsLoading, refresh: refreshAssets } = useAvailableAssets();

  // Fallback strategies when API returns empty
  const defaultStrategies: StrategyDefinition[] = [
    { id: 'take-profit', name: 'Take Profit', description: 'Auto-close at fixed profit target (5%)', riskLevel: 'conservative' },
    { id: 'trailing-stop', name: 'Trailing Stop', description: 'Dynamic stop that follows price', riskLevel: 'conservative' },
    { id: 'vwap-exit', name: 'VWAP Exit', description: 'Exit when price crosses VWAP', riskLevel: 'standard' },
    { id: 'adx-momentum', name: 'ADX Momentum', description: 'Exit when trend weakens', riskLevel: 'standard' },
  ];

  const displayStrategies = availableStrategies.length > 0 ? availableStrategies : defaultStrategies;

  useEffect(() => {
    setSelectedTokens(new Set(allowedTokens));
  }, [allowedTokens]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toUpperCase();
    return allTokens.filter(token => token.includes(query));
  }, [searchQuery, allTokens]);

  const toggleToken = (token: string) => {
    setSelectedTokens(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedTokens.size === 0) {
      showToast('error', 'Please select at least one token');
      return;
    }
    await onSavePolicy(Array.from(selectedTokens));
    setShowTokenModal(false);
  };

  const maxDailyNum = parseFloat(maxDailyNotional) || 10000;
  const maxDrawdownNum = parseFloat(maxDrawdown) || 10;

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT COLUMN - Configuration */}
        <motion.div className="space-y-4" variants={containerVariants}>
          {/* Risk Limits */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Risk Limits</h3>
            <div className="grid grid-cols-3 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <EditableStatCard
                  label="Max Leverage"
                  value={maxLeverage}
                  suffix="x"
                  onChange={setMaxLeverage}
                  min={1}
                  max={20}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <EditableStatCard
                  label="Max Drawdown"
                  value={maxDrawdown}
                  suffix="%"
                  onChange={setMaxDrawdown}
                  min={1}
                  max={50}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <EditableStatCard
                  label="Daily Limit"
                  value={(parseFloat(maxDailyNotional) / 1000).toFixed(0)}
                  suffix="K"
                  onChange={(v) => setMaxDailyNotional((parseFloat(v) * 1000).toString())}
                  min={1}
                  max={1000}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Auto-Close Toggle */}
          <AnimatePresence>
            {setAutoCloseEnabled && (
              <motion.div
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white font-medium">Auto-Close</span>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Close positions if drawdown limit hit
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setAutoCloseEnabled(!autoCloseEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      autoCloseEnabled ? 'bg-tago-yellow-400' : 'bg-white/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: autoCloseEnabled ? 24 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Allowed Tokens - Compact View */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide">Allowed Tokens</h3>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
              >
                <Badge variant="yellow">{selectedTokens.size}</Badge>
              </motion.div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.from(selectedTokens).slice(0, 6).map((token, index) => (
                <motion.span
                  key={token}
                  className="text-xs bg-tago-yellow-400/20 text-tago-yellow-400 px-2 py-1 rounded"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(232, 255, 0, 0.3)' }}
                >
                  {token}
                </motion.span>
              ))}
              {selectedTokens.size > 6 && (
                <motion.span
                  className="text-xs text-white/40 px-2 py-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  +{selectedTokens.size - 6} more
                </motion.span>
              )}
            </div>
            <motion.button
              onClick={() => setShowTokenModal(true)}
              className="w-full py-2 text-xs text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-colors"
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.98 }}
            >
              Manage Tokens
            </motion.button>
          </motion.div>

          {/* Robo Strategies */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Robo Strategies</h3>
            <motion.div className="space-y-2" variants={containerVariants}>
              {displayStrategies.map((strategy, index) => {
                  const userStrategy = userStrategies.find(us => us.strategy_id === strategy.id);
                  const isActive = userStrategy?.active ?? false;
                  const isExpanded = expandedStrategy === strategy.id;
                  const strategyParams = DEFAULT_STRATEGY_PARAMS[strategy.id] || {};
                  const riskColors = {
                    conservative: 'text-emerald-400 bg-emerald-400/10',
                    standard: 'text-tago-yellow-400 bg-tago-yellow-400/10',
                    degen: 'text-red-400 bg-red-400/10',
                  };

                  // Get current param values (edited > user saved > defaults)
                  const getCurrentParamValue = (paramKey: string) => {
                    if (editedParams[strategy.id]?.[paramKey] !== undefined) {
                      return editedParams[strategy.id][paramKey];
                    }
                    if (userStrategy?.params?.[paramKey] !== undefined) {
                      return userStrategy.params[paramKey] as number;
                    }
                    return strategyParams[paramKey]?.value ?? 0;
                  };

                  // Update a param value
                  const updateParam = (paramKey: string, value: number) => {
                    setEditedParams(prev => ({
                      ...prev,
                      [strategy.id]: {
                        ...prev[strategy.id],
                        [paramKey]: value,
                      },
                    }));
                  };

                  // Get all current params for saving
                  const getAllCurrentParams = () => {
                    const params: Record<string, number> = {};
                    Object.keys(strategyParams).forEach(key => {
                      params[key] = getCurrentParamValue(key);
                    });
                    return params;
                  };

                  return (
                    <motion.div
                      key={strategy.id}
                      className={`bg-white/[0.02] rounded-lg border transition-colors overflow-hidden ${
                        isActive ? 'border-tago-yellow-400/30 bg-tago-yellow-400/5' : 'border-white/[0.05]'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {/* Strategy Header */}
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => setExpandedStrategy(isExpanded ? null : strategy.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <motion.span
                              className="text-white/40 text-xs"
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              ▶
                            </motion.span>
                            <span className="text-sm text-white font-medium truncate">{strategy.name}</span>
                            <motion.span
                              className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${riskColors[strategy.riskLevel]}`}
                            >
                              {strategy.riskLevel}
                            </motion.span>
                            <AnimatePresence>
                              {isActive && (
                                <motion.span
                                  className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium text-emerald-400 bg-emerald-400/10"
                                  initial={{ opacity: 0, scale: 0, x: -10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0, x: -10 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                >
                                  Active
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <p className="text-[10px] text-white/40 truncate mt-0.5 ml-5">
                            {getStrategyExplanation(strategy.id, getAllCurrentParams())}
                          </p>
                        </div>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const params = getAllCurrentParams();
                            onToggleStrategy?.(strategy.id, !isActive, params);
                          }}
                          type="button"
                          disabled={isTogglingStrategy || !onToggleStrategy}
                          className={`relative z-10 w-10 h-5 rounded-full flex-shrink-0 ml-3 ${
                            isActive ? 'bg-tago-yellow-400' : 'bg-white/20'
                          } ${isTogglingStrategy || !onToggleStrategy ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isActive ? 'Disable strategy' : 'Enable strategy'}
                          whileTap={{ scale: 0.9 }}
                          animate={{ backgroundColor: isActive ? '#E8FF00' : 'rgba(255,255,255,0.2)' }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.span
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                            animate={{ left: isActive ? 20 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </motion.button>
                      </div>

                      {/* Expanded Params */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 border-t border-white/[0.05] space-y-3">
                              <p className="text-[10px] text-white/30">{strategy.description}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(strategyParams).map(([paramKey, paramDef]) => (
                                  <div key={paramKey} className="bg-white/[0.03] rounded-lg p-2">
                                    <label className="text-[10px] text-white/50 block mb-1">{paramDef.label}</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min={paramDef.min}
                                        max={paramDef.max}
                                        step={paramDef.step}
                                        value={getCurrentParamValue(paramKey)}
                                        onChange={(e) => updateParam(paramKey, parseFloat(e.target.value))}
                                        className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tago-yellow-400"
                                      />
                                      <span className="text-xs text-white font-medium w-10 text-right">
                                        {getCurrentParamValue(paramKey)}{paramDef.suffix}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Save params button if edited */}
                              {editedParams[strategy.id] && Object.keys(editedParams[strategy.id]).length > 0 && (
                                <motion.button
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const params = getAllCurrentParams();
                                    onToggleStrategy?.(strategy.id, isActive, params);
                                    // Clear edited params after saving
                                    setEditedParams(prev => {
                                      const { [strategy.id]: _, ...rest } = prev;
                                      return rest;
                                    });
                                  }}
                                  disabled={isTogglingStrategy}
                                  className="w-full py-1.5 text-xs bg-tago-yellow-400/20 text-tago-yellow-400 rounded-lg hover:bg-tago-yellow-400/30 transition-colors disabled:opacity-50"
                                >
                                  {isTogglingStrategy ? 'Saving...' : 'Save Changes'}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
            </motion.div>
          </motion.div>

          {/* Save Button */}
          <motion.div variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="yellow"
                fullWidth
                size="lg"
                onClick={handleSave}
                loading={savingPolicy}
              >
                Save Risk Settings
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN - Live Metrics */}
        <motion.div className="space-y-4" variants={containerVariants}>
          {/* Live Risk Metrics */}
          <motion.div
            className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.15)', scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Live Metrics</h3>
            <motion.div className="space-y-1" variants={containerVariants}>
              <motion.div variants={itemVariants}>
                <MetricCard
                  label="Unrealized P&L"
                  value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`}
                  positive={unrealizedPnl >= 0}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard
                  label="Daily Volume"
                  value={`$${todayNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
              </motion.div>
              {winRate !== undefined && (
                <motion.div variants={itemVariants}>
                  <MetricCard
                    label="Win Rate"
                    value={`${winRate.toFixed(0)}%`}
                    subValue={`${totalTrades} trades`}
                    positive={winRate >= 50}
                  />
                </motion.div>
              )}
              {accountHealth !== undefined && (
                <motion.div variants={itemVariants}>
                  <MetricCard
                    label="Account Health"
                    value={`${accountHealth.toFixed(0)}%`}
                    positive={accountHealth > 50}
                  />
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Drawdown Gauge */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Drawdown Status</h3>
            <ProgressGauge
              label="Current Drawdown"
              current={currentDrawdown}
              max={maxDrawdownNum}
              unit="%"
              warningThreshold={0.7}
              dangerThreshold={0.9}
            />
            <motion.p
              className="text-[10px] text-white/30 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {currentDrawdown < maxDrawdownNum * 0.5
                ? 'Healthy - within safe limits'
                : currentDrawdown < maxDrawdownNum * 0.8
                ? 'Caution - approaching limit'
                : 'Warning - near max drawdown'}
            </motion.p>
          </motion.div>

          {/* Daily Utilization */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Daily Utilization</h3>
            <ProgressGauge
              label="Notional Used"
              current={todayNotional}
              max={maxDailyNum}
              unit="$"
              warningThreshold={0.8}
              dangerThreshold={0.95}
            />
            <motion.p
              className="text-[10px] text-white/30 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              ${remainingNotional.toLocaleString()} remaining today
            </motion.p>
          </motion.div>

          {/* Recent Robo Actions */}
          <motion.div
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
            variants={itemVariants}
            whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Robo Action History</h3>
            <AnimatePresence mode="wait">
              {recentRuns.length > 0 ? (
                <motion.div
                  className="space-y-2 max-h-[280px] overflow-y-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {recentRuns.slice(0, 8).map((run, index) => {
                    const strategy = displayStrategies.find(s => s.id === run.strategy_definition_id);
                    const statusConfig = {
                      running: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: '◌', label: 'Running' },
                      completed: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: '✓', label: 'Completed' },
                      failed: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: '✕', label: 'Failed' },
                    };
                    const status = statusConfig[run.status];
                    const timeAgo = getTimeAgo(run.started_at);

                    // Extract action details from result
                    const action = run.result?.action as string | undefined;
                    const closedPositions = run.result?.details?.closedPositions as Array<{ asset: string; reason: string }> | undefined;
                    const message = run.result?.details?.message as string | undefined;

                    // Determine action display
                    let actionText = '';
                    let actionColor = 'text-white/50';
                    if (action === 'position_closed' && closedPositions?.length) {
                      actionText = `Closed ${closedPositions.map(p => p.asset).join(', ')}`;
                      actionColor = 'text-tago-yellow-400';
                    } else if (action === 'none') {
                      actionText = message || 'No action needed';
                    } else if (run.error) {
                      actionText = run.error.slice(0, 40);
                      actionColor = 'text-red-400';
                    }

                    return (
                      <motion.div
                        key={run.id}
                        className={`p-2.5 rounded-lg border bg-white/[0.02] ${status.color.split(' ')[2] || 'border-white/[0.05]'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', scale: 1.01 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <motion.span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${status.color}`}
                                animate={run.status === 'running' ? { opacity: [1, 0.5, 1] } : {}}
                                transition={{ repeat: run.status === 'running' ? Infinity : 0, duration: 1.5 }}
                              >
                                {status.icon} {status.label}
                              </motion.span>
                              <span className="text-xs font-medium text-white/80 truncate">
                                {strategy?.name || 'Unknown Strategy'}
                              </span>
                            </div>
                            {actionText && (
                              <p className={`text-[10px] mt-1 truncate ${actionColor}`}>
                                {actionText}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0 whitespace-nowrap">
                            {timeAgo}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  className="text-center py-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/[0.05] flex items-center justify-center">
                    <span className="text-lg text-white/30">🤖</span>
                  </div>
                  <p className="text-xs text-white/40">No robo actions yet</p>
                  <p className="text-[10px] text-white/25 mt-1">Enable a strategy to start automated trading</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      {/* Token Management Modal */}
      <AnimatePresence>
        {showTokenModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTokenModal(false)}
          >
            <motion.div
              className="bg-black/95 border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-medium text-white">Manage Tokens</h3>
                <p className="text-xs text-white/40">{allTokens.length} available from Hyperliquid</p>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search & Quick Actions */}
            <div className="p-4 border-b border-white/[0.05]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tokens..."
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-tago-yellow-400/50"
                />
                <Button variant="ghost" size="sm" onClick={() => setSelectedTokens(new Set(allTokens))}>All</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTokens(new Set())}>None</Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-white/40">{selectedTokens.size} selected</span>
                <button
                  onClick={refreshAssets}
                  disabled={assetsLoading}
                  className="text-xs text-white/40 hover:text-white transition-colors disabled:opacity-50"
                >
                  {assetsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Token List */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {filteredTokens ? (
                <div className="flex flex-wrap gap-1.5">
                  {filteredTokens.length === 0 ? (
                    <p className="text-sm text-white/30">No tokens found</p>
                  ) : (
                    filteredTokens.map(token => (
                      <button
                        key={token}
                        onClick={() => toggleToken(token)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                          selectedTokens.has(token)
                            ? 'bg-tago-yellow-400 text-black font-medium'
                            : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                        }`}
                      >
                        {token}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(tokenCategories).map(([category, tokens]) => {
                    const selectedInCategory = tokens.filter(t => selectedTokens.has(t)).length;
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/60 font-medium">{category}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={selectedInCategory > 0 ? 'yellow' : 'default'} className="text-[10px]">
                              {selectedInCategory}/{tokens.length}
                            </Badge>
                            <button
                              onClick={() => {
                                setSelectedTokens(prev => {
                                  const next = new Set(prev);
                                  tokens.forEach(t => next.add(t));
                                  return next;
                                });
                              }}
                              className="text-[10px] text-white/40 hover:text-tago-yellow-400"
                            >
                              All
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tokens.map(token => (
                            <button
                              key={token}
                              onClick={() => toggleToken(token)}
                              className={`px-2 py-1 text-xs rounded-lg transition-all ${
                                selectedTokens.has(token)
                                  ? 'bg-tago-yellow-400 text-black font-medium'
                                  : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                              }`}
                            >
                              {token}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08]">
              <div className="flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setShowTokenModal(false)}>
                  Cancel
                </Button>
                <Button variant="yellow" fullWidth onClick={handleSave} loading={savingPolicy}>
                  Save ({selectedTokens.size} tokens)
                </Button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
