'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { pearApi, saltApi, NarrativeSuggestion } from '@/lib/api';
import { usePearAuth } from '@/hooks/usePearAuth';
import { useSaltAccount } from '@/hooks/useSaltAccount';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { useBuilderFee } from '@/hooks/useBuilderFee';
import { usePositions } from '@/hooks/usePositions';
import { useStrategies } from '@/hooks/useStrategies';
import { PerformanceChart } from '@/components/PerformanceChart';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { RiskManagementTab } from '@/components/RiskManagementTab';

type TabType = 'trade' | 'portfolio' | 'risk' | 'history';
// Trade mode is now auto-detected: pair (1v1) or basket (multiple assets per side)

export default function RoboPage() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as TabType | null;
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isAuthenticating,
    error: authError,
    authenticate,
  } = usePearAuth();
  const {
    account,
    policy,
    trades,
    isLoading: accountLoading,
    isCreating,
    error: accountError,
    createAccount,
    refreshTrades,
  } = useSaltAccount();
  const {
    agentWalletAddress,
    exists: agentWalletExists,
    isLoading: agentWalletLoading,
    isCreating: agentWalletCreating,
    isApproving: agentWalletApproving,
    needsApproval: agentWalletNeedsApproval,
    error: agentWalletError,
    createAgentWallet,
    approveAgentWallet,
  } = useAgentWallet();
  const {
    isApproved: builderFeeApproved,
    isLoading: builderFeeLoading,
    isApproving: builderFeeApproving,
    needsChainSwitch,
    error: builderFeeError,
    approveBuilderFee,
  } = useBuilderFee();
  const {
    positions,
    isLoading: positionsLoading,
    isClosing,
    error: positionsError,
    refresh: refreshPositions,
    closePosition,
    totalValue,
    totalPnl,
    totalPnlPercent,
  } = usePositions();
  const {
    availableStrategies,
    userStrategies,
    recentRuns,
    isLoading: strategiesLoading,
    isToggling,
    error: strategiesError,
    toggleStrategy,
    refreshRuns,
  } = useStrategies(account?.id || null);
  const {
    balance: hlBalance,
    isLoading: balanceLoading,
    error: balanceError,
    refresh: refreshBalance,
  } = useHyperliquidBalance();

  // Tab state - sync with URL
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || 'trade');

  // Sync tab with URL changes
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);

  // AI Trade Builder state
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [stakeUsd, setStakeUsd] = useState('100');
  const [leverage, setLeverage] = useState(3);
  // Trade mode auto-detected from suggestion assets
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isRefreshingAfterTrade, setIsRefreshingAfterTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Toast state - unified to prevent stacking, auto-dismisses based on text length
  type ToastType = { type: 'error' | 'success'; message: string; id?: string; details?: string[] } | null;
  const [toast, setToast] = useState<ToastType>(null);

  // Calculate toast duration based on text length (reading time)
  const calculateToastDuration = useCallback((message: string, details?: string[]) => {
    // Base time + time per word (average reading speed ~200 words/min = ~3 words/sec)
    const allText = message + (details ? ' ' + details.join(' ') : '');
    const wordCount = allText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 3) * 1000; // ~3 words per second
    // Minimum 4s, maximum 15s
    return Math.min(Math.max(4000, readingTime + 2000), 15000);
  }, []);

  // Helper to show toast (replaces any existing toast)
  const showToast = useCallback((type: 'error' | 'success', message: string, id?: string, details?: string[]) => {
    setToast({ type, message, id, details });
  }, []);

  // Auto-dismiss toast based on text length
  useEffect(() => {
    if (!toast) return;
    const duration = calculateToastDuration(toast.message, toast.details);
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, calculateToastDuration]);

  // Policy state
  const [maxLeverage, setMaxLeverage] = useState('5');
  const [maxDailyNotional, setMaxDailyNotional] = useState('10000');
  const [maxDrawdown, setMaxDrawdown] = useState('10');
  const [allowedTokens, setAllowedTokens] = useState<string[]>([
    'BTC', 'ETH', 'SOL', 'LINK', 'ARB', 'OP', 'AVAX', 'DOGE', 'PEPE', 'WIF'
  ]);

  // Sync policy state from fetched policy
  useEffect(() => {
    if (policy) {
      if (policy.max_leverage !== null && policy.max_leverage !== undefined) {
        setMaxLeverage(String(policy.max_leverage));
      }
      if (policy.max_daily_notional_usd !== null && policy.max_daily_notional_usd !== undefined) {
        setMaxDailyNotional(String(policy.max_daily_notional_usd));
      }
      if (policy.max_drawdown_pct !== null && policy.max_drawdown_pct !== undefined) {
        setMaxDrawdown(String(policy.max_drawdown_pct));
      }
      if (policy.allowed_pairs && Array.isArray(policy.allowed_pairs)) {
        setAllowedTokens(policy.allowed_pairs as string[]);
      }
    }
  }, [policy]);

  // Advanced section state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Get AI suggestion
  const handleGetSuggestion = async () => {
    if (!prompt.trim()) {
      setError('Please enter your trading idea');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);
    setTradeResult(null);

    try {
      const data = await pearApi.suggestNarrative(prompt);
      setSuggestion(data);
      setStakeUsd(data.suggestedStakeUsd?.toString() || '100');
      setLeverage(Math.min(data.suggestedLeverage || 3, parseInt(maxLeverage) || 5));
    } catch (err) {
      console.error('Failed to get suggestion:', err);
      setError('Failed to generate suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update asset weight
  const updateAssetWeight = (side: 'long' | 'short', index: number, newWeight: number) => {
    if (!suggestion) return;
    const assets = side === 'long' ? [...suggestion.longAssets] : [...suggestion.shortAssets];
    assets[index] = { ...assets[index], weight: newWeight };
    setSuggestion({
      ...suggestion,
      [side === 'long' ? 'longAssets' : 'shortAssets']: assets,
    });
  };

  // Remove asset from suggestion
  const removeAsset = (side: 'long' | 'short', assetToRemove: string) => {
    if (!suggestion) return;
    const assets = side === 'long' ? suggestion.longAssets : suggestion.shortAssets;
    const otherSide = side === 'long' ? suggestion.shortAssets : suggestion.longAssets;
    const filtered = assets.filter(a => a.asset !== assetToRemove);

    // Allow removing all assets from one side (long-only or short-only trades)
    // But don't allow removing all assets from BOTH sides
    if (filtered.length === 0 && otherSide.length === 0) {
      showToast('error', 'Cannot remove all assets - need at least one side');
      return;
    }

    // Redistribute weights among remaining assets (if any)
    const normalizedAssets = filtered.length > 0
      ? (() => {
          const totalWeight = filtered.reduce((sum, a) => sum + a.weight, 0);
          return filtered.map(a => ({
            ...a,
            weight: totalWeight > 0 ? a.weight / totalWeight : 1 / filtered.length
          }));
        })()
      : [];

    setSuggestion({
      ...suggestion,
      [side === 'long' ? 'longAssets' : 'shortAssets']: normalizedAssets,
    });
  };

  // Execute trade through Salt account (with policy validation)
  const handleExecute = async () => {
    if (!address || !suggestion || !account) {
      showToast('error', 'Please ensure you have a Salt account');
      return;
    }

    const stake = parseFloat(stakeUsd);
    const notionalRequired = stake * leverage;

    // Hyperliquid requires minimum $10 notional
    if (notionalRequired < 10) {
      showToast('error', `Minimum notional is $10. Your trade is $${notionalRequired.toFixed(2)} (${stake} × ${leverage}x). Increase stake or leverage.`);
      return;
    }

    // Check against policy limits (client-side check, Salt will also validate server-side)
    const maxLev = parseInt(maxLeverage) || 5;
    if (leverage > maxLev) {
      showToast('error', `Leverage exceeds your policy limit of ${maxLev}x`);
      return;
    }

    // Check balance before executing
    if (hlBalance && hlBalance.availableBalance < notionalRequired) {
      showToast('error', `Insufficient balance. You need $${notionalRequired.toFixed(2)} but only have $${hlBalance.availableBalance.toFixed(2)} available.`);
      return;
    }

    // Filter out 0-weight assets before sending to backend
    const activeLongAssets = suggestion.longAssets.filter(a => a.weight > 0);
    const activeShortAssets = suggestion.shortAssets.filter(a => a.weight > 0);

    // Validate we have at least one asset on either side (supports long-only or short-only trades)
    if (activeLongAssets.length === 0 && activeShortAssets.length === 0) {
      showToast('error', 'Need at least one asset with weight > 0%');
      return;
    }

    // Check per-asset minimum notional (Hyperliquid requires ~$10 per position)
    const totalAssets = activeLongAssets.length + activeShortAssets.length;
    const minNotionalPerAsset = 10;
    const minTotalNotional = totalAssets * minNotionalPerAsset;

    if (notionalRequired < minTotalNotional) {
      const allAssets = [...activeLongAssets, ...activeShortAssets];
      const smallestAllocation = Math.min(...allAssets.map(a => a.weight * notionalRequired));
      showToast(
        'error',
        `Per-asset minimum not met`,
        undefined,
        [
          `Hyperliquid requires ~$10 minimum per position.`,
          `With ${totalAssets} assets, you need at least $${minTotalNotional} total notional.`,
          `Current: $${notionalRequired.toFixed(2)} (smallest position: $${smallestAllocation.toFixed(2)})`,
          `Increase stake, leverage, or reduce number of assets.`
        ]
      );
      return;
    }

    setExecuting(true);
    setToast(null);

    try {
      // Route through Salt service for policy validation before executing via Pear
      const result = await saltApi.executePairTrade(account.id, {
        longAssets: activeLongAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        shortAssets: activeShortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        stakeUsd: stake,
        leverage,
      });

      const trade = result.trade || result;
      setTradeResult(trade);
      setSuggestion(null);
      setPrompt('');

      // Show success toast
      showToast('success', trade.status === 'completed' ? 'Trade executed successfully!' : `Trade submitted (${trade.status})`, trade.id);

      // Refresh data with loading state
      setIsRefreshingAfterTrade(true);
      try {
        await Promise.all([refreshTrades(), refreshPositions(), refreshBalance()]);
      } finally {
        setIsRefreshingAfterTrade(false);
      }
    } catch (err: any) {
      console.error('Failed to execute trade:', err);
      const errorMessage = err.tradeError?.message || err.message || 'Failed to execute trade';

      // Parse policy violation errors for better display
      if (errorMessage.includes('Policy violation')) {
        // Extract individual violations from the message
        const parts = errorMessage
          .replace('Policy violation: ', '')
          .replace('Policy violation:', '')
          .split(', ')
          .filter((v: string) => v.trim());

        const violations: string[] = [];
        const disallowedAssets: string[] = [];

        for (const v of parts) {
          if (v.includes('not in allowed pairs')) {
            const assetMatch = v.match(/Asset (\w+) is not/);
            if (assetMatch) {
              disallowedAssets.push(assetMatch[1]);
            }
          } else if (v.includes('Leverage') && v.includes('exceeds')) {
            const match = v.match(/(\d+)x exceeds.*?(\d+)x/);
            if (match) {
              violations.push(`Leverage too high: Using ${match[1]}x but your limit is ${match[2]}x. Go to Risk tab to increase.`);
            }
          } else if (v.includes('notional') && v.includes('exceeds')) {
            violations.push('Daily trading limit exceeded. Wait until tomorrow or increase limit in Risk tab.');
          } else {
            violations.push(v);
          }
        }

        // Add collected disallowed assets as single message at the top
        if (disallowedAssets.length > 0) {
          violations.unshift(`Disallowed tokens: ${disallowedAssets.join(', ')}. Remove them or add to Risk settings.`);
        }

        showToast('error', 'Trade blocked by your risk settings', undefined, violations);
      } else {
        showToast('error', errorMessage);
      }
    } finally {
      setExecuting(false);
    }
  };

  // Save policy
  const handleSavePolicy = async (tokens?: string[]) => {
    if (!account) return;

    const tokensToSave = tokens || allowedTokens;
    setSavingPolicy(true);
    try {
      await saltApi.setPolicy(account.id, {
        maxLeverage: parseFloat(maxLeverage),
        maxDailyNotionalUsd: parseFloat(maxDailyNotional),
        maxDrawdownPct: parseFloat(maxDrawdown),
        allowedPairs: tokensToSave,
      });
      if (tokens) {
        setAllowedTokens(tokens);
      }
      showToast('success', 'Risk settings saved successfully');
    } catch (err) {
      console.error('Failed to save policy:', err);
      showToast('error', 'Failed to save policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handle close position
  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId);
  };

  // Determine if user needs setup (for showing setup prompts)
  const needsSetup = !isConnected || !isAuthenticated || (!agentWalletExists && !agentWalletLoading) || (!builderFeeApproved && !builderFeeLoading) || (!account && !accountLoading);

  // Helper component for Connect Wallet button on action buttons
  const ConnectWalletPrompt = ({ className = '' }: { className?: string }) => (
    <Button
      variant="yellow"
      fullWidth
      size="lg"
      onClick={openConnectModal}
      className={className}
    >
      Connect Wallet
    </Button>
  );

  // If not connected, show main UI with connect wallet prompts
  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 max-w-md animate-in slide-in-from-right fade-in duration-300">
            <div className={`relative backdrop-blur-sm border rounded-xl p-4 shadow-2xl ${
              toast.type === 'error'
                ? 'bg-red-500/95 border-red-400/50 shadow-red-500/20'
                : 'bg-green-500/95 border-green-400/50 shadow-green-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {toast.type === 'error' ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-1">
                    {toast.type === 'error' ? 'Error' : 'Success'}
                  </p>
                  <p className="text-sm text-white/90 font-light leading-relaxed">{toast.message}</p>
                </div>
                <button onClick={() => setToast(null)} className="flex-shrink-0 text-white/70 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Narrative Trading Tab */}
        {activeTab === 'trade' && (
          <SwapPanel title="Narrative Trading" subtitle="Describe your thesis, get a pair trade">
            <div className="space-y-2">
              <label className="block text-sm font-light text-white/70">Your Trading Idea</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., I think AI tokens will outperform ETH in the coming weeks..."
                className="w-full h-24 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-light placeholder:text-white/30 focus:outline-none focus:border-tago-yellow-400/50 focus:ring-1 focus:ring-tago-yellow-400/20 resize-none transition-all"
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-white/40 font-light">
                  Examples: "SOL ecosystem is heating up", "DeFi will recover vs majors"
                </p>
                <span className="text-xs text-white/40">{prompt.length}/1000</span>
              </div>
            </div>

            <ConnectWalletPrompt />
          </SwapPanel>
        )}

        {/* Portfolio Tab - Blurred without connection */}
        {activeTab === 'portfolio' && (
          <SwapPanel title="Portfolio" subtitle="Your open positions">
            <div className="relative">
              <div className="blur-sm pointer-events-none">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Total Value</span>
                    <span className="text-lg font-medium text-white">$0.00</span>
                  </div>
                </div>
                <div className="text-center py-8 text-white/40">
                  <p className="text-sm">No open positions</p>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-white/60 mb-3">Connect wallet to view portfolio</p>
                  <Button variant="yellow" onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </div>
          </SwapPanel>
        )}

        {/* Risk Tab - Blurred without connection */}
        {activeTab === 'risk' && (
          <SwapPanel title="Risk Management" subtitle="Configure your trading limits">
            <div className="relative">
              <div className="blur-sm pointer-events-none">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
                    <span className="text-xs text-white/40">Max Leverage</span>
                    <p className="text-lg font-medium text-white">5x</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
                    <span className="text-xs text-white/40">Max Drawdown</span>
                    <p className="text-lg font-medium text-white">10%</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-white/60 mb-3">Connect wallet to manage risk settings</p>
                  <Button variant="yellow" onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </div>
          </SwapPanel>
        )}

        {/* History Tab - Blurred without connection */}
        {activeTab === 'history' && (
          <SwapPanel title="Trade History" subtitle="Your past trades">
            <div className="relative">
              <div className="blur-sm pointer-events-none">
                <div className="text-center py-8 text-white/40">
                  <p className="text-sm">No trade history</p>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-white/60 mb-3">Connect wallet to view history</p>
                  <Button variant="yellow" onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </div>
          </SwapPanel>
        )}
      </div>
    );
  }

  // Step 2: Authenticate with Pear Protocol (only show if connected but not authenticated)
  if (isConnected && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/40 font-light">Connected</span>
              <p className="text-sm text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
            </div>
            <ConnectButton.Custom>
              {({ openAccountModal }) => (
                <button onClick={openAccountModal} className="text-xs text-white/40 hover:text-white">
                  Change
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </Card>

        <SwapPanel title="Authenticate" subtitle="Sign in to Pear Protocol">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Sign a message to authenticate with Pear Protocol. This enables AI trade suggestions
              and execution on Hyperliquid.
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{authError}</p>
            </div>
          )}

          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={authenticate}
            loading={isAuthenticating || authLoading}
          >
            {isAuthenticating ? 'Signing...' : 'Sign to Authenticate'}
          </Button>
        </SwapPanel>
      </div>
    );
  }

  // Step 3: Setup Agent Wallet (Create + Approve on Hyperliquid)
  if (isConnected && isAuthenticated && !agentWalletExists && !agentWalletLoading) {
    // Sub-step: Need to create agent wallet first
    if (!agentWalletAddress && !agentWalletNeedsApproval) {
      return (
        <div className="space-y-6">
          <Card>
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-white/40 font-light">Authenticated</span>
                <p className="text-sm text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
              <Badge variant="success">Ready</Badge>
            </div>
          </Card>

          <SwapPanel title="Setup Agent Wallet" subtitle="Step 1: Create wallet">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
              <p className="text-sm text-white/60 font-light leading-relaxed">
                Create an agent wallet to allow Pear Protocol to execute trades on Hyperliquid on your behalf.
              </p>
            </div>

            {agentWalletError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{agentWalletError}</p>
              </div>
            )}

            <Button
              variant="yellow"
              fullWidth
              size="lg"
              onClick={() => createAgentWallet()}
              loading={agentWalletCreating}
            >
              {agentWalletCreating ? 'Creating...' : 'Create Agent Wallet'}
            </Button>
          </SwapPanel>
        </div>
      );
    }

    // Sub-step: Agent wallet created, need Hyperliquid approval
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/40 font-light">Agent Wallet Created</span>
              <p className="text-sm text-white font-mono">{agentWalletAddress?.slice(0, 6)}...{agentWalletAddress?.slice(-4)}</p>
            </div>
            <Badge variant="warning">Pending Approval</Badge>
          </div>
        </Card>

        <SwapPanel title="Approve on Hyperliquid" subtitle="Step 2: Sign approval">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm text-yellow-400 font-medium">
              Deposit required first
            </p>
            <p className="text-xs text-yellow-400/70">
              Hyperliquid requires a USDC deposit before you can approve an agent wallet. Deposit any amount to continue.
            </p>
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-tago-yellow-400 font-medium hover:underline"
            >
              Open Hyperliquid to deposit USDC →
            </a>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Sign a message to approve Pear Protocol to trade on Hyperliquid on your behalf. This is a one-time approval.
            </p>
            <div className="text-xs text-white/40 space-y-1">
              <p>After approval, you also need to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Approve builder fee (0.06% per trade)</li>
              </ul>
            </div>
          </div>

          {agentWalletError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{agentWalletError}</p>
            </div>
          )}

          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={() => agentWalletAddress && approveAgentWallet(agentWalletAddress)}
            loading={agentWalletApproving}
          >
            {agentWalletApproving ? 'Approving...' : 'Approve Agent Wallet'}
          </Button>
        </SwapPanel>
      </div>
    );
  }

  // Step 3.5: Approve Builder Fee on Hyperliquid
  if (isConnected && isAuthenticated && agentWalletExists && !builderFeeApproved && !builderFeeLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/40 font-light">Agent Wallet</span>
              <p className="text-sm text-white font-mono">{agentWalletAddress?.slice(0, 6)}...{agentWalletAddress?.slice(-4)}</p>
            </div>
            <Badge variant="success">Approved</Badge>
          </div>
        </Card>

        <SwapPanel title="Approve Builder Fee" subtitle="Step 3: Enable trading fees">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Authorize Pear Protocol to collect a small trading fee (0.1% max) on each trade. This is required by Hyperliquid for all builder integrations.
            </p>
            <div className="text-xs text-white/40">
              <p>Pear builder address:</p>
              <p className="font-mono text-white/60 break-all">0xA47D4d99191db54A4829cdf3de2417E527c3b042</p>
            </div>
          </div>

          {needsChainSwitch && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                Please switch to <strong>Arbitrum</strong> network in your wallet to sign this approval.
              </p>
            </div>
          )}

          {builderFeeError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{builderFeeError}</p>
            </div>
          )}

          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={approveBuilderFee}
            loading={builderFeeApproving}
            disabled={needsChainSwitch}
          >
            {builderFeeApproving ? 'Approving...' : needsChainSwitch ? 'Switch to Arbitrum' : 'Approve Builder Fee'}
          </Button>

          <div className="text-center">
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-tago-yellow-400 hover:underline"
            >
              Make sure you have USDC deposited on Hyperliquid
            </a>
          </div>
        </SwapPanel>
      </div>
    );
  }

  // Step 4: Create Salt Account
  if (isConnected && isAuthenticated && agentWalletExists && builderFeeApproved && !account) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/40 font-light">Hyperliquid Ready</span>
              <p className="text-sm text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
            </div>
            <Badge variant="success">All Approvals Complete</Badge>
          </div>
        </Card>

        <SwapPanel title="Create Robo Account" subtitle="Set up your trading account">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Create a Salt robo account to track your trades and manage risk policies.
            </p>
          </div>

          {accountError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{accountError}</p>
            </div>
          )}

          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={createAccount}
            loading={isCreating || accountLoading}
          >
            Create Robo Account
          </Button>
        </SwapPanel>
      </div>
    );
  }

  // Step 5: Main Dashboard
  return (
    <div className="space-y-6">
      {/* Toast Notification - Fixed position on right side, stays until dismissed */}
      {toast && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 max-w-md animate-in slide-in-from-right fade-in duration-300">
          <div className={`relative backdrop-blur-sm border rounded-xl p-4 shadow-2xl ${
            toast.type === 'error'
              ? 'bg-red-500/95 border-red-400/50 shadow-red-500/20'
              : 'bg-green-500/95 border-green-400/50 shadow-green-500/20'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {toast.type === 'error' ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-1">
                  {toast.type === 'error' ? 'Policy Violation' : 'Trade Executed'}
                </p>
                <p className="text-sm text-white/90 font-light leading-relaxed">{toast.message}</p>
                {/* Show details list if available */}
                {toast.details && toast.details.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {toast.details.map((detail, i) => (
                      <li key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                        <span className="text-white/50 mt-0.5">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {toast.id && (
                  <p className="text-xs text-white/60 mt-2 font-mono">ID: {toast.id.slice(0, 8)}...</p>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Tab - Narrative Trading */}
      {activeTab === 'trade' && (
        <SwapPanel title="Narrative Trading" subtitle="Describe your thesis, get a pair trade">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="block text-sm font-light text-white/70">Your Trading Idea</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I think AI tokens will outperform ETH in the coming weeks..."
              className="w-full h-24 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-light placeholder:text-white/30 focus:outline-none focus:border-tago-yellow-400/50 focus:ring-1 focus:ring-tago-yellow-400/20 resize-none transition-all"
              maxLength={1000}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-white/40 font-light">
                Examples: "SOL ecosystem is heating up", "DeFi will recover vs majors"
              </p>
              <span className="text-xs text-white/40">{prompt.length}/1000</span>
            </div>
          </div>

          <Button
            variant="ghost"
            fullWidth
            onClick={handleGetSuggestion}
            loading={loading}
            disabled={!prompt.trim()}
          >
            Get AI Suggestion
          </Button>

          {/* AI Suggestion Display */}
          {suggestion && (
            <>
              {/* VS Battle Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] p-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-xs uppercase tracking-widest text-green-400/60 mb-2">Long</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {suggestion.longAssets.map((asset) => {
                        const isDisallowed = !allowedTokens.includes(asset.asset);
                        return (
                          <span
                            key={asset.asset}
                            className={`group relative px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                              isDisallowed
                                ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                                : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                            }`}
                            title={isDisallowed ? `${asset.asset} is not in your allowed tokens - click to remove` : `Click to remove ${asset.asset}`}
                            onClick={() => removeAsset('long', asset.asset)}
                          >
                            {asset.asset}
                            {isDisallowed && <span className="ml-1 text-orange-400/80">!</span>}
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <svg className="w-2.5 h-2.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <div className="w-px h-8 bg-gradient-to-b from-green-500/50 to-transparent" />
                    <span className="text-white/20 text-xs font-bold my-2">VS</span>
                    <div className="w-px h-8 bg-gradient-to-t from-red-500/50 to-transparent" />
                  </div>

                  <div className="flex-1 text-center">
                    <div className="text-xs uppercase tracking-widest text-red-400/60 mb-2">Short</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {suggestion.shortAssets.map((asset) => {
                        const isDisallowed = !allowedTokens.includes(asset.asset);
                        return (
                          <span
                            key={asset.asset}
                            className={`group relative px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                              isDisallowed
                                ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                                : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                            }`}
                            title={isDisallowed ? `${asset.asset} is not in your allowed tokens - click to remove` : `Click to remove ${asset.asset}`}
                            onClick={() => removeAsset('short', asset.asset)}
                          >
                            {asset.asset}
                            {isDisallowed && <span className="ml-1 text-orange-400/80">!</span>}
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <svg className="w-2.5 h-2.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        suggestion.confidence >= 0.7 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                        suggestion.confidence >= 0.4 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                        'bg-gradient-to-r from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40 tabular-nums">{Math.round(suggestion.confidence * 100)}% confidence</span>
                </div>

                {suggestion.warnings && suggestion.warnings.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-yellow-400/60">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-wider">volatile pair</span>
                  </div>
                )}
              </div>

              {/* Historical Performance Chart */}
              <PerformanceChart
                longAsset={suggestion.longAssets[0]?.asset}
                shortAsset={suggestion.shortAssets[0]?.asset}
                days={180}
              />

              {/* Rationale */}
              <details className="group/rationale">
                <summary className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 cursor-pointer list-none hover:from-white/[0.06] transition-all">
                  <div className="w-6 h-6 rounded-full bg-tago-yellow-400/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-tago-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/50 flex-1">{suggestion.narrative}</span>
                  <svg className="w-4 h-4 text-white/30 transition-transform group-open/rationale:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                  <p className="text-sm text-white/60 leading-relaxed">{suggestion.rationale}</p>
                </div>
              </details>

              {/* Weight Adjustment */}
              <details className="group">
                <summary className="flex items-center gap-2 text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  adjust weights
                </summary>
                <div className="mt-3 space-y-2">
                  {suggestion.longAssets.map((asset, i) => (
                    <div key={asset.asset} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-green-400/70">{asset.asset}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(asset.weight * 100)}
                        onChange={(e) => updateAssetWeight('long', i, parseInt(e.target.value) / 100)}
                        className="flex-1 accent-green-400 h-1"
                      />
                      <span className="w-10 text-right text-white/40 tabular-nums">{Math.round(asset.weight * 100)}%</span>
                    </div>
                  ))}
                  {suggestion.shortAssets.map((asset, i) => (
                    <div key={asset.asset} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-red-400/70">{asset.asset}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(asset.weight * 100)}
                        onChange={(e) => updateAssetWeight('short', i, parseInt(e.target.value) / 100)}
                        className="flex-1 accent-red-400 h-1"
                      />
                      <span className="w-10 text-right text-white/40 tabular-nums">{Math.round(asset.weight * 100)}%</span>
                    </div>
                  ))}
                </div>
              </details>

              {/* Trade Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Stake (USD)"
                  type="number"
                  value={stakeUsd}
                  onChange={(e) => setStakeUsd(e.target.value)}
                  placeholder="100"
                />
                <div className="space-y-2">
                  <label className="block text-sm font-light text-white/70">
                    Leverage: {leverage}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max={parseInt(maxLeverage) || 5}
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value))}
                    className="w-full accent-tago-yellow-400"
                  />
                  <div className="flex justify-between text-xs text-white/40">
                    <span>1x</span>
                    <span>{maxLeverage}x max</span>
                  </div>
                </div>
              </div>

              {/* Trade Summary */}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-light">Type</span>
                  <span className="text-white font-light">
                    {suggestion.longAssets.filter(a => a.weight > 0).length === 0 ? 'Short Only' :
                     suggestion.shortAssets.filter(a => a.weight > 0).length === 0 ? 'Long Only' :
                     (suggestion.longAssets.filter(a => a.weight > 0).length + suggestion.shortAssets.filter(a => a.weight > 0).length) > 2 ? 'Basket' : 'Pair'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-light">Stake</span>
                  <span className="text-white font-light">${parseFloat(stakeUsd || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-light">Leverage</span>
                  <span className="text-white font-light">{leverage}x</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/[0.08] pt-3">
                  <span className="text-white/40 font-light">Notional Exposure</span>
                  <span className="text-tago-yellow-400 font-medium">
                    ${(parseFloat(stakeUsd || '0') * leverage).toFixed(2)}
                  </span>
                </div>

                {/* Balance Check */}
                <div className="border-t border-white/[0.08] pt-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 font-light">Available Balance</span>
                    {balanceLoading ? (
                      <span className="text-white/40 text-xs">Loading...</span>
                    ) : balanceError ? (
                      <span className="text-red-400 text-xs">Error loading</span>
                    ) : (
                      <span className={`font-medium ${
                        hlBalance && hlBalance.availableBalance >= (parseFloat(stakeUsd || '0') * leverage)
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        ${hlBalance?.availableBalance.toFixed(2) || '0.00'}
                      </span>
                    )}
                  </div>

                  {/* Insufficient balance warning */}
                  {hlBalance && hlBalance.availableBalance < (parseFloat(stakeUsd || '0') * leverage) && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-xs text-red-400 mb-2">
                        Insufficient balance. Need ${((parseFloat(stakeUsd || '0') * leverage) - hlBalance.availableBalance).toFixed(2)} more.
                      </p>
                      <a
                        href="https://app.hyperliquid.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-tago-yellow-400 hover:underline"
                      >
                        Deposit USDC on Hyperliquid
                      </a>
                    </div>
                  )}

                  {/* Account health indicator */}
                  {hlBalance && hlBalance.accountHealth < 50 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                      <p className="text-xs text-yellow-400">
                        Account health: {hlBalance.accountHealth.toFixed(0)}% - Consider reducing leverage
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pre-execution warning for disallowed assets */}
              {suggestion && (() => {
                const disallowedLong = suggestion.longAssets.filter(a => a.weight > 0 && !allowedTokens.includes(a.asset));
                const disallowedShort = suggestion.shortAssets.filter(a => a.weight > 0 && !allowedTokens.includes(a.asset));
                const allDisallowed = [...disallowedLong, ...disallowedShort];

                if (allDisallowed.length > 0) {
                  return (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-amber-400 font-medium">Disallowed tokens detected</p>
                          <p className="text-white/50 text-xs mt-1">
                            {allDisallowed.map(a => a.asset).join(', ')} not in your allowed list.
                            Click tokens to remove or add them in Risk settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <Button
                variant="yellow"
                fullWidth
                size="lg"
                onClick={handleExecute}
                loading={executing}
                disabled={
                  balanceLoading ||
                  (hlBalance !== null && hlBalance.availableBalance < (parseFloat(stakeUsd || '0') * leverage))
                }
              >
                {hlBalance && hlBalance.availableBalance < (parseFloat(stakeUsd || '0') * leverage)
                  ? 'Insufficient Balance'
                  : 'Execute Trade'}
              </Button>
            </>
          )}

        </SwapPanel>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <SwapPanel title="Portfolio" subtitle="Your open positions and P&L">
          {/* Portfolio Summary */}
          <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] rounded-xl p-4 space-y-3">
            {/* Account Equity from Hyperliquid */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Account Equity</span>
              {balanceLoading ? (
                <span className="text-sm text-white/40">Loading...</span>
              ) : balanceError ? (
                <span className="text-sm text-white/40">--</span>
              ) : (
                <span className="text-lg text-white font-medium">
                  ${hlBalance?.equity?.toFixed(2) || '0.00'}
                </span>
              )}
            </div>

            {/* Available Balance */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Available</span>
              <span className="text-sm text-emerald-400">
                ${hlBalance?.availableBalance?.toFixed(2) || '0.00'}
              </span>
            </div>

            {/* Positions Value (if any) */}
            {positions.length > 0 && (
              <div className="flex justify-between items-center border-t border-white/[0.08] pt-3">
                <span className="text-sm text-white/40 font-light">Positions Value</span>
                <span className="text-lg text-white font-medium">${totalValue.toFixed(2)}</span>
              </div>
            )}

            {/* Unrealized P&L */}
            {(hlBalance?.unrealizedPnl !== 0 || positions.length > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/40 font-light">Unrealized P&L</span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-medium ${(hlBalance?.unrealizedPnl ?? totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(hlBalance?.unrealizedPnl ?? totalPnl) >= 0 ? '+' : ''}${(hlBalance?.unrealizedPnl ?? totalPnl).toFixed(2)}
                  </span>
                  {positions.length > 0 && (
                    <span className={`text-sm ${totalPnl >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                      ({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Positions Error with Retry */}
          {positionsError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium">Failed to load positions</p>
                  <p className="text-xs text-white/40 mt-1">{positionsError}</p>
                  <Button variant="ghost" size="sm" onClick={refreshPositions} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Open Positions */}
          <div className="space-y-2">
            <h3 className="text-sm font-light text-white/70">Open Positions</h3>

            {(positionsLoading || isRefreshingAfterTrade) ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-tago-yellow-400" />
                  <p className="text-white/40 font-light">
                    {isRefreshingAfterTrade ? 'Updating positions...' : 'Loading positions...'}
                  </p>
                </div>
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                <p className="text-white/40 font-light">No open positions</p>
                <p className="text-xs text-white/30 mt-1">Execute a trade to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-3"
                  >
                    {/* Position Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={position.pnl >= 0 ? 'success' : 'error'}>
                          {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-white/40">{position.leverage}x</span>
                      </div>
                      <span className={`text-sm font-medium ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                      </span>
                    </div>

                    {/* Assets */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-green-400/60 mb-1">Long</div>
                        <div className="flex flex-wrap gap-1">
                          {position.longAssets.map((asset) => (
                            <span key={asset.asset} className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                              {asset.asset}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-white/20 text-xs">vs</div>
                      <div className="flex-1 text-right">
                        <div className="text-xs text-red-400/60 mb-1">Short</div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {position.shortAssets.map((asset) => (
                            <span key={asset.asset} className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                              {asset.asset}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Position Details */}
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Value: ${position.usdValue.toFixed(2)}</span>
                      <span>Entry: {new Date(position.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      fullWidth
                      size="sm"
                      onClick={() => handleClosePosition(position.id)}
                      loading={isClosing}
                    >
                      Close Position
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" fullWidth onClick={refreshPositions}>
            Refresh Portfolio
          </Button>
        </SwapPanel>
      )}

      {/* Risk Management Tab */}
      {activeTab === 'risk' && (
        <RiskManagementTab
          maxLeverage={maxLeverage}
          setMaxLeverage={setMaxLeverage}
          maxDailyNotional={maxDailyNotional}
          setMaxDailyNotional={setMaxDailyNotional}
          maxDrawdown={maxDrawdown}
          setMaxDrawdown={setMaxDrawdown}
          savingPolicy={savingPolicy}
          onSavePolicy={handleSavePolicy}
          showToast={showToast}
          allowedTokens={allowedTokens}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <SwapPanel title="Trade History" subtitle="Your recent trades">
          {accountLoading ? (
            <div className="text-center py-8">
              <p className="text-white/40 font-light">Loading trade history...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40 font-light">No trades yet</p>
              <p className="text-xs text-white/30 mt-1">Execute a trade to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08] hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-white font-light truncate">
                          {trade.narrative_id || 'Direct Trade'}
                        </p>
                        {trade.source === 'salt' && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            Robo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        {trade.direction} · ${trade.stake_usd} · {new Date(trade.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        trade.status === 'completed' ? 'success' :
                        trade.status === 'pending' ? 'info' : 'error'
                      }
                    >
                      {trade.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="ghost" fullWidth onClick={refreshTrades}>
            Refresh History
          </Button>
        </SwapPanel>
      )}

      {/* Advanced Details - Collapsible section at bottom */}
      <div className="mt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Advanced
        </button>

        {showAdvanced && (
          <div className="mt-2 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {/* Wallet Address */}
              <div>
                <span className="text-xs text-white/30 block mb-1">Wallet</span>
                <p className="text-xs text-white/60 font-mono truncate">{address || 'Not connected'}</p>
              </div>

              {/* Robo Account */}
              {account && (
                <div>
                  <span className="text-xs text-white/30 block mb-1">Robo Account</span>
                  <p className="text-xs text-white/60 font-mono truncate">{account.salt_account_address}</p>
                </div>
              )}

              {/* Agent Wallet */}
              {agentWalletAddress && (
                <div>
                  <span className="text-xs text-white/30 block mb-1">Agent Wallet</span>
                  <p className="text-xs text-white/60 font-mono truncate">{agentWalletAddress}</p>
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/40">Connected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/40">Authenticated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${agentWalletExists ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/40">Agent Wallet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${builderFeeApproved ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/40">Builder Fee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${account ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/40">Robo Account</span>
                </div>
              </div>

              {/* Hyperliquid Balance */}
              {hlBalance && (
                <div className="pt-2 border-t border-white/[0.05]">
                  <span className="text-xs text-white/30 block mb-1">Hyperliquid Balance</span>
                  <p className="text-xs text-white/60">
                    Available: <span className="text-white/80">${hlBalance.availableBalance.toFixed(2)}</span>
                    <span className="ml-2">
                      Equity: <span className="text-white/80">${hlBalance.equity.toFixed(2)}</span>
                    </span>
                    {hlBalance.unrealizedPnl !== 0 && (
                      <span className={`ml-2 ${hlBalance.unrealizedPnl >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                        PnL: {hlBalance.unrealizedPnl >= 0 ? '+' : ''}${hlBalance.unrealizedPnl.toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
