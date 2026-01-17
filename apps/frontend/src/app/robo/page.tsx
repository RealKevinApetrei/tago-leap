'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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

type TabType = 'trade' | 'portfolio' | 'settings' | 'history';
type TradeMode = 'pair' | 'basket';

export default function RoboPage() {
  const { isConnected, address } = useAccount();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isAuthenticating,
    error: authError,
    authenticate,
  } = usePearAuth();
  const {
    account,
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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('trade');

  // AI Trade Builder state
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [stakeUsd, setStakeUsd] = useState('100');
  const [leverage, setLeverage] = useState(3);
  const [tradeMode, setTradeMode] = useState<TradeMode>('pair');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [tradeResult, setTradeResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Policy state
  const [maxLeverage, setMaxLeverage] = useState('5');
  const [maxDailyNotional, setMaxDailyNotional] = useState('10000');
  const [maxDrawdown, setMaxDrawdown] = useState('10');
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

  // Execute trade through Salt account
  const handleExecute = async () => {
    if (!address || !suggestion || !account) {
      setError('Please ensure you have a Salt account');
      return;
    }

    const stake = parseFloat(stakeUsd);
    if (stake < 1) {
      setError('Minimum stake is $1');
      return;
    }

    // Check against policy limits
    const maxLev = parseInt(maxLeverage) || 5;
    if (leverage > maxLev) {
      setError(`Leverage exceeds your policy limit of ${maxLev}x`);
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const trade = await pearApi.executeTrade({
        userWalletAddress: address,
        longAssets: suggestion.longAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        shortAssets: suggestion.shortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        stakeUsd: stake,
        leverage,
      });
      setTradeResult(trade);
      setSuggestion(null);
      setPrompt('');
      // Refresh trade history and positions
      refreshTrades();
      refreshPositions();
    } catch (err: any) {
      console.error('Failed to execute trade:', err);
      setError(err.message || 'Failed to execute trade. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  // Save policy
  const handleSavePolicy = async () => {
    if (!account) return;

    setSavingPolicy(true);
    try {
      await saltApi.setPolicy(account.id, {
        maxLeverage: parseFloat(maxLeverage),
        maxDailyNotionalUsd: parseFloat(maxDailyNotional),
        maxDrawdownPct: parseFloat(maxDrawdown),
        allowedPairs: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      });
      setError(null);
    } catch (err) {
      console.error('Failed to save policy:', err);
      setError('Failed to save policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handle close position
  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId);
  };

  // Step 1: Connect Wallet
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SwapPanel title="Connect Wallet" subtitle="Start your robo trading journey">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <h3 className="font-light text-white mb-2">
              What is <span className="italic text-tago-yellow-400">AI Robo Trading</span>?
            </h3>
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Describe your market thesis in plain English, get AI-powered trade suggestions,
              and execute pair trades on Hyperliquid with built-in risk management.
            </p>
          </div>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </SwapPanel>
      </div>
    );
  }

  // Step 2: Authenticate with Pear Protocol
  if (!isAuthenticated) {
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
  if (!agentWalletExists && !agentWalletLoading) {
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
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            <p className="text-sm text-white/60 font-light leading-relaxed">
              Sign a message to approve Pear Protocol to trade on Hyperliquid on your behalf. This is a one-time approval.
            </p>
            <div className="text-xs text-white/40 space-y-1">
              <p>After approval, you also need to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Deposit USDC to Hyperliquid</li>
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

          <div className="text-center">
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-tago-yellow-400 hover:underline"
            >
              Open Hyperliquid to deposit USDC
            </a>
          </div>
        </SwapPanel>
      </div>
    );
  }

  // Step 3.5: Approve Builder Fee on Hyperliquid
  if (!builderFeeApproved && !builderFeeLoading) {
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
  if (!account) {
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
      {/* Account Header */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-light">Robo Account</span>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-sm text-tago-yellow-400 font-mono truncate">
            {account.salt_account_address}
          </p>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
        {(['trade', 'portfolio', 'settings', 'history'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-sm font-light rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-tago-yellow-400 text-black'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {tab === 'trade' ? 'AI Trade' : tab === 'portfolio' ? 'Portfolio' : tab === 'settings' ? 'Settings' : 'History'}
          </button>
        ))}
      </div>

      {/* Trade Tab - AI Trade Builder */}
      {activeTab === 'trade' && (
        <SwapPanel title="AI Trade Builder" subtitle="Describe your thesis, get a pair trade">
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

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400 font-light">{error}</p>
            </div>
          )}

          {/* AI Suggestion Display */}
          {suggestion && (
            <>
              {/* Trade Mode Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-light text-white/70">Trade Mode</label>
                <div className="flex gap-2 p-1 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <button
                    onClick={() => setTradeMode('pair')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-all ${
                      tradeMode === 'pair'
                        ? 'bg-tago-yellow-400 text-black font-medium'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Pair Trade
                  </button>
                  <button
                    onClick={() => setTradeMode('basket')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-all ${
                      tradeMode === 'basket'
                        ? 'bg-tago-yellow-400 text-black font-medium'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Basket Trade
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  {tradeMode === 'pair'
                    ? 'Trade one asset against another (e.g., long SOL / short ETH)'
                    : 'Trade a basket of assets against a benchmark'}
                </p>
              </div>

              {/* VS Battle Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] p-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-xs uppercase tracking-widest text-green-400/60 mb-2">Long</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {suggestion.longAssets.map((asset) => (
                        <span key={asset.asset} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium">
                          {asset.asset}
                        </span>
                      ))}
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
                      {suggestion.shortAssets.map((asset) => (
                        <span key={asset.asset} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium">
                          {asset.asset}
                        </span>
                      ))}
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
                  <span className="text-white/40 font-light">Mode</span>
                  <span className="text-white font-light capitalize">{tradeMode}</span>
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
              </div>

              <Button
                variant="yellow"
                fullWidth
                size="lg"
                onClick={handleExecute}
                loading={executing}
              >
                Execute {tradeMode === 'pair' ? 'Pair' : 'Basket'} Trade
              </Button>
            </>
          )}

          {/* Trade Result */}
          {tradeResult && (
            <Card variant="solid" className="bg-green-500/10 border-green-500/20">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="success">Trade Executed</Badge>
                </div>
                <p className="text-sm text-white/60 font-light">Trade ID: {tradeResult.id}</p>
                <p className="text-sm text-white/60 font-light">Status: {tradeResult.status}</p>
              </div>
            </Card>
          )}
        </SwapPanel>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <SwapPanel title="Portfolio" subtitle="Your open positions and P&L">
          {/* Portfolio Summary */}
          <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Portfolio Value</span>
              <span className="text-lg text-white font-medium">${totalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40 font-light">Unrealized P&L</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-medium ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </span>
                <span className={`text-sm ${totalPnl >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                  ({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {positionsError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400 font-light">{positionsError}</p>
            </div>
          )}

          {/* Open Positions */}
          <div className="space-y-2">
            <h3 className="text-sm font-light text-white/70">Open Positions</h3>

            {positionsLoading ? (
              <div className="text-center py-8">
                <p className="text-white/40 font-light">Loading positions...</p>
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Risk Policy */}
          <SwapPanel title="Risk Policy" subtitle="Configure your trading limits">
            <Input
              label="Max Leverage"
              type="number"
              value={maxLeverage}
              onChange={(e) => setMaxLeverage(e.target.value)}
              helperText="Maximum leverage for any position (1-20)"
            />

            <Input
              label="Max Daily Notional (USD)"
              type="number"
              value={maxDailyNotional}
              onChange={(e) => setMaxDailyNotional(e.target.value)}
              helperText="Maximum total position size per day"
            />

            <Input
              label="Max Drawdown (%)"
              type="number"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(e.target.value)}
              helperText="Stop trading if losses exceed this percentage"
            />

            <Button
              variant="yellow"
              fullWidth
              onClick={handleSavePolicy}
              loading={savingPolicy}
            >
              Save Policy
            </Button>
          </SwapPanel>

          {/* Automated Strategies */}
          <SwapPanel title="Automated Strategies" subtitle="Enable robo trading strategies">
            {strategiesError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400 font-light">{strategiesError}</p>
              </div>
            )}

            {strategiesLoading ? (
              <div className="text-center py-4">
                <p className="text-white/40 font-light">Loading strategies...</p>
              </div>
            ) : availableStrategies.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-white/40 font-light">No strategies available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableStrategies.map((strategy) => {
                  const userStrategy = userStrategies.find(s => s.strategy_id === strategy.id);
                  const isActive = userStrategy?.active || false;

                  return (
                    <div
                      key={strategy.id}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-white font-medium">{strategy.name}</span>
                            <Badge
                              variant={
                                strategy.riskLevel === 'conservative' ? 'info' :
                                strategy.riskLevel === 'standard' ? 'warning' : 'error'
                              }
                            >
                              {strategy.riskLevel}
                            </Badge>
                          </div>
                          <p className="text-xs text-white/50">{strategy.description}</p>
                        </div>
                        <button
                          onClick={() => toggleStrategy(strategy.id, !isActive)}
                          disabled={isToggling}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            isActive ? 'bg-tago-yellow-400' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              isActive ? 'left-7' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SwapPanel>

          {/* Recent Robo Actions */}
          <SwapPanel title="Recent Robo Actions" subtitle="Automated trading activity">
            {recentRuns.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-white/40 font-light">No automated actions yet</p>
                <p className="text-xs text-white/30 mt-1">Enable a strategy to start robo trading</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-light truncate">
                        {run.strategy_id}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(run.started_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        run.status === 'completed' ? 'success' :
                        run.status === 'running' ? 'info' : 'error'
                      }
                    >
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <Button variant="ghost" fullWidth onClick={refreshRuns}>
              Refresh Actions
            </Button>
          </SwapPanel>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <SwapPanel title="Trade History" subtitle="Your recent AI-generated trades">
          {trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40 font-light">No trades yet</p>
              <p className="text-xs text-white/30 mt-1">Generate your first AI trade above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-light truncate">
                      {trade.narrative_id || 'AI Trade'}
                    </p>
                    <p className="text-xs text-white/40">
                      {trade.direction} · ${trade.stake_usd}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
    </div>
  );
}
