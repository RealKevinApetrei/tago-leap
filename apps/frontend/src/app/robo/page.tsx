'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { pearApi, saltApi, NarrativeSuggestion } from '@/lib/api';
import { SocialTradingTab } from '@/components/social';
import { usePearAuth } from '@/hooks/usePearAuth';
import { useSaltAccount } from '@/hooks/useSaltAccount';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { useBuilderFee } from '@/hooks/useBuilderFee';
import { usePositions } from '@/hooks/usePositions';
import { useStrategies } from '@/hooks/useStrategies';
import { PerformanceChart } from '@/components/PerformanceChart';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { RiskManagementTab } from '@/components/RiskManagementTab';
import { useOneClickSetup, SetupStep } from '@/hooks/useOneClickSetup';
import { usePolicyValidation } from '@/hooks/usePolicyValidation';
import { useDepositModal } from '@/components/DepositModal';
import { SidePanelsProvider, PanelType } from '@/components/SidePanels';

type PortfolioView = 'positions' | 'history';
// Trade mode is now auto-detected: pair (1v1) or basket (multiple assets per side)

export default function RoboPage() {
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

  // One-click setup orchestration
  const {
    steps: setupSteps,
    currentStep: setupCurrentStep,
    isRunning: setupRunning,
    isComplete: setupComplete,
    error: setupError,
    startSetup,
    reset: resetSetup,
  } = useOneClickSetup();

  // Deposit modal
  const { openDeposit } = useDepositModal();

  // Policy validation for risk tracking
  const {
    policy: policyLimits,
    todayNotional,
    remainingNotional,
  } = usePolicyValidation(account?.id || null);

  // Portfolio view state (for sub-tabs within portfolio panel)
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('positions');

  // Side panel state
  const [activePanel, setActivePanel] = useState<PanelType>(null);

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

  // Policy saving state
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

      // Open portfolio panel to show the new position
      setActivePanel('portfolio');
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
      } else if (errorMessage.includes('Position size too small') || errorMessage.includes('MIN_SIZE_ERROR')) {
        // Minimum position size error - show specific asset requirements
        const match = errorMessage.match(/Each asset needs at least \$(\d+)/);
        const minAmount = match ? match[1] : '10';
        showToast('error', `Each asset needs at least $${minAmount} notional. Increase stake or leverage.`);
      } else if (errorMessage.includes('rejected by the exchange') || errorMessage.includes('rejected by exchange')) {
        // Exchange rejection - usually minimum notional or unsupported trade type
        const friendlyMsg = stake * leverage < 10
          ? 'Trade too small - minimum is $10 notional (stake × leverage)'
          : 'Exchange rejected the trade - try increasing stake or adjusting assets';
        showToast('error', friendlyMsg);
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        showToast('error', 'Not enough balance - deposit more USDC on Hyperliquid');
      } else if (errorMessage.includes('not authenticated') || errorMessage.includes('unauthorized')) {
        showToast('error', 'Session expired - please refresh and try again');
      } else {
        // Generic error - keep it simple
        showToast('error', 'Trade failed - please try again');
        console.error('Trade error details:', errorMessage);
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

  // Portfolio content for side panel (not connected state)
  const notConnectedPortfolioContent = (
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
  );

  // Risk content for side panel (not connected state)
  const notConnectedRiskContent = (
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
  );

  // If not connected, show main UI with connect wallet prompts
  if (!isConnected) {
    return (
      <SidePanelsProvider
        portfolioContent={notConnectedPortfolioContent}
        riskContent={notConnectedRiskContent}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
      >
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
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

          {/* Narrative Trading - Always shown */}
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
        </div>
      </SidePanelsProvider>
    );
  }

  // Only show setup panel if user hasn't authenticated at all
  // If they've authenticated via homepage, let them through even if other steps aren't complete
  if (isConnected && !isAuthenticated && !authLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <SwapPanel title="Setup Required" subtitle="Authenticate to start trading">
          <div className="space-y-4">
            <p className="text-white/50 text-sm text-center">
              Please complete setup on the homepage first.
            </p>

            {/* Action */}
            <a
              href="/"
              className="block w-full py-3 text-center bg-tago-yellow-400 text-black font-medium rounded-lg hover:bg-tago-yellow-300 transition-colors"
            >
              Go to Homepage
            </a>
          </div>
        </SwapPanel>
      </div>
    );
  }

  // Helper to truncate address
  const truncateAddress = (addr: string | null | undefined) => {
    if (!addr) return '...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Portfolio content for side panel
  const portfolioContent = (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Stats & Risk */}
        <div className="space-y-4">
          {/* Address Info Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Addresses</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">User Wallet</span>
                <span className="text-xs text-white/70 font-mono">{truncateAddress(address)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Salt Manager</span>
                <span className="text-xs text-white/70 font-mono">{truncateAddress(account?.salt_account_address)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Pear Agent</span>
                <span className="text-xs text-white/70 font-mono">{truncateAddress(agentWalletAddress)}</span>
              </div>
            </div>
          </div>

          {/* Account Summary Card */}
          <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] rounded-xl p-4 space-y-3">
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide">Account</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Equity</span>
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
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Available</span>
              <span className="text-sm text-emerald-400">
                ${hlBalance?.availableBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-white/[0.08] pt-3">
              <span className="text-sm text-white/40 font-light">Unrealized P&L</span>
              {(() => {
                const pnlValue = hlBalance?.unrealizedPnl ?? totalPnl;
                const equityBase = hlBalance?.equity ? hlBalance.equity - pnlValue : 0;
                const pnlPercent = equityBase > 0 ? (pnlValue / equityBase) * 100 : totalPnlPercent;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-medium ${pnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}
                    </span>
                    <span className={`text-xs ${pnlValue >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                      ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Risk Metrics Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide">Risk Status</h3>
            {policyLimits && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Daily Notional</span>
                  <span className="text-white/70">
                    ${todayNotional.toFixed(0)} / ${policyLimits.maxDailyNotionalUsd.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (todayNotional / policyLimits.maxDailyNotionalUsd) > 0.8
                        ? 'bg-yellow-500'
                        : (todayNotional / policyLimits.maxDailyNotionalUsd) > 0.9
                        ? 'bg-red-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (todayNotional / policyLimits.maxDailyNotionalUsd) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {hlBalance?.accountHealth !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Account Health</span>
                  <span className={`font-medium ${
                    hlBalance.accountHealth > 50 ? 'text-green-400' :
                    hlBalance.accountHealth > 25 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {hlBalance.accountHealth.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hlBalance.accountHealth > 50 ? 'bg-green-500' :
                      hlBalance.accountHealth > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${hlBalance.accountHealth}%` }}
                  />
                </div>
              </div>
            )}
            {policyLimits && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                <div>
                  <span className="text-xs text-white/40">Max Leverage</span>
                  <p className="text-sm text-white font-medium">{policyLimits.maxLeverage}x</p>
                </div>
                <div>
                  <span className="text-xs text-white/40">Max Drawdown</span>
                  <p className="text-sm text-white font-medium">{policyLimits.maxDrawdownPct}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Pear Executions */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-xs text-white/50 font-medium uppercase tracking-wide mb-3">Pear Executions</h3>
            {trades.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-2">No executions yet</p>
            ) : (
              <div className="space-y-2">
                {trades.slice(0, 4).map((trade) => {
                  const payload = trade.pear_order_payload;
                  const longAssets = payload?.longAssets || [];
                  const shortAssets = payload?.shortAssets || [];
                  const tradeLabel = longAssets.length > 0 && shortAssets.length > 0
                    ? `${longAssets.map(a => a.asset).join('+')} vs ${shortAssets.map(a => a.asset).join('+')}`
                    : longAssets.length > 0
                    ? `Long ${longAssets.map(a => a.asset).join('+')}`
                    : `Short ${shortAssets.map(a => a.asset).join('+')}`;

                  return (
                    <div key={trade.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-0">
                      <span className="text-xs text-white/70 truncate">{tradeLabel}</span>
                      <Badge variant={trade.status === 'completed' ? 'success' : trade.status === 'pending' ? 'info' : 'error'} className="text-[9px]">
                        {trade.status === 'completed' ? 'OK' : trade.status}
                      </Badge>
                    </div>
                  );
                })}
                {trades.length > 4 && (
                  <button onClick={() => setPortfolioView('history')} className="text-[10px] text-white/40 hover:text-white/60 w-full text-center pt-1">
                    +{trades.length - 4} more
                  </button>
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" fullWidth size="sm" onClick={() => { refreshPositions(); refreshBalance(); }}>
            Refresh Data
          </Button>
        </div>

        {/* Right Column: Positions/History */}
        <div className="space-y-3">
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
            <button
              onClick={() => setPortfolioView('positions')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                portfolioView === 'positions'
                  ? 'bg-tago-yellow-400 text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Positions ({positions.length})
            </button>
            <button
              onClick={() => setPortfolioView('history')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                portfolioView === 'history'
                  ? 'bg-tago-yellow-400 text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              History
            </button>
          </div>

          {portfolioView === 'positions' && (
            <div className="space-y-3">
              {positionsError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-sm text-red-400">{positionsError}</p>
                  <Button variant="ghost" size="sm" onClick={refreshPositions} className="mt-2">Retry</Button>
                </div>
              )}
              {(positionsLoading || isRefreshingAfterTrade) ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <div className="inline-flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-tago-yellow-400" />
                    <p className="text-white/40 font-light">{isRefreshingAfterTrade ? 'Updating...' : 'Loading...'}</p>
                  </div>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <svg className="w-12 h-12 mx-auto text-white/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-white/40 font-light">No open positions</p>
                  <p className="text-xs text-white/30 mt-1">Execute a trade to see it here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {positions.map((position) => (
                    <div key={position.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-2">
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
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex gap-1">
                          {position.longAssets.map((asset) => (
                            <span key={asset.asset} className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">{asset.asset}</span>
                          ))}
                        </div>
                        {position.shortAssets.length > 0 && (
                          <>
                            <span className="text-white/20">vs</span>
                            <div className="flex gap-1">
                              {position.shortAssets.map((asset) => (
                                <span key={asset.asset} className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{asset.asset}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-white/40">
                        <span>${position.usdValue.toFixed(2)}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleClosePosition(position.id)} loading={isClosing} className="!py-1 !px-2 text-xs">Close</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {portfolioView === 'history' && (
            <div className="space-y-3">
              {accountLoading ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <div className="w-6 h-6 mx-auto mb-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/40 font-light text-sm">Loading trades...</p>
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <svg className="w-10 h-10 mx-auto text-white/10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-white/50 font-light text-sm">No trades yet</p>
                  <p className="text-xs text-white/30 mt-1">Completed trades will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {trades.map((trade) => {
                    const date = new Date(trade.created_at);
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                    // Extract assets from pear_order_payload
                    const payload = trade.pear_order_payload;
                    const longAssets = payload?.longAssets || [];
                    const shortAssets = payload?.shortAssets || [];
                    const leverage = payload?.leverage || 1;

                    // Determine trade type and generate display name
                    const hasLong = longAssets.length > 0;
                    const hasShort = shortAssets.length > 0;
                    const isPair = hasLong && hasShort;
                    const isBasket = (longAssets.length > 1) || (shortAssets.length > 1);

                    // Generate trade name
                    let tradeName = '';
                    if (isPair) {
                      // Pair trade: "BTC vs ETH" or "AI vs L1" for baskets
                      const longSymbols = longAssets.map(a => a.asset).join('+');
                      const shortSymbols = shortAssets.map(a => a.asset).join('+');
                      tradeName = `${longSymbols} vs ${shortSymbols}`;
                    } else if (hasLong) {
                      // Long only
                      const symbols = longAssets.map(a => a.asset).join(', ');
                      tradeName = isBasket ? `Long ${symbols}` : `Long ${symbols}`;
                    } else if (hasShort) {
                      // Short only
                      const symbols = shortAssets.map(a => a.asset).join(', ');
                      tradeName = isBasket ? `Short ${symbols}` : `Short ${symbols}`;
                    } else {
                      tradeName = trade.narrative_id !== 'custom' ? trade.narrative_id : 'Trade';
                    }

                    return (
                      <div key={trade.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all">
                        {/* Top row: Trade Name + Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm text-white font-medium truncate">
                              {tradeName}
                            </span>
                            {trade.source === 'salt' && (
                              <span className="flex-shrink-0 text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                            )}
                          </div>
                          <Badge
                            variant={trade.status === 'completed' ? 'success' : trade.status === 'pending' ? 'info' : 'error'}
                          >
                            {trade.status === 'completed' ? 'Filled' : trade.status === 'pending' ? 'Pending' : trade.status}
                          </Badge>
                        </div>

                        {/* Asset badges row */}
                        {(hasLong || hasShort) && (
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {longAssets.map((a) => (
                              <span key={`long-${a.asset}`} className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                                ↑{a.asset}
                              </span>
                            ))}
                            {isPair && <span className="text-white/20 text-[10px]">vs</span>}
                            {shortAssets.map((a) => (
                              <span key={`short-${a.asset}`} className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                ↓{a.asset}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom row: Details */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3 text-white/50">
                            {/* Leverage */}
                            <span className="text-white/40">{leverage}x</span>
                            {/* Stake */}
                            <span className="text-white/40">
                              ${Number(trade.stake_usd).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          {/* Timestamp */}
                          <span className="text-white/30 tabular-nums">
                            {dateStr} · {timeStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={refreshTrades}
                className="w-full py-2 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.02] rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Calculate win rate from trades
  const completedTrades = trades.filter(t => t.status === 'completed');
  const winningTrades = completedTrades.filter(t => {
    // Consider a trade "winning" if it's completed (simplified - would need P&L data for real calculation)
    return t.status === 'completed';
  });
  const calculatedWinRate = completedTrades.length > 0
    ? (winningTrades.length / completedTrades.length) * 100
    : undefined;

  // Risk content for side panel
  const riskContent = (
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
      // Hedge fund metrics
      todayNotional={todayNotional}
      remainingNotional={remainingNotional}
      currentDrawdown={0}
      unrealizedPnl={hlBalance?.unrealizedPnl ?? totalPnl}
      accountHealth={hlBalance?.accountHealth}
      winRate={calculatedWinRate}
      totalTrades={completedTrades.length}
      // Strategy props for SALT compliance
      availableStrategies={availableStrategies}
      userStrategies={userStrategies}
      recentRuns={recentRuns}
      isTogglingStrategy={isToggling}
      onToggleStrategy={toggleStrategy}
    />
  );

  // Step 5: Main Dashboard
  return (
    <SidePanelsProvider
      portfolioContent={portfolioContent}
      riskContent={riskContent}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
    >
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

      {/* Social Trading Tab */}
      <SocialTradingTab
        accountId={account?.id || null}
        maxLeverage={parseInt(maxLeverage) || 5}
        availableBalance={hlBalance?.availableBalance || 0}
        accountHealth={hlBalance?.accountHealth}
        walletAddress={address}
        onTradeSuccess={async () => {
          showToast('success', 'Trade executed successfully!');
          setIsRefreshingAfterTrade(true);
          try {
            await Promise.all([refreshTrades(), refreshPositions(), refreshBalance()]);
          } finally {
            setIsRefreshingAfterTrade(false);
          }
          setActivePanel('portfolio');
        }}
      />
      </div>
    </SidePanelsProvider>
  );
}
