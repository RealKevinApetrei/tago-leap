'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SocialTradingLayout,
  ColumnHeader,
} from './SocialTradingLayout';
import { type CryptoTweet } from './TweetCard';
import { TwitterFeedColumn } from './TwitterFeedColumn';
import { CenterPanel } from './CenterPanel';
import { TradeControlPanel } from './TradeControlPanel';
import { StrategyInfoTab } from './StrategyInfoTab';
import { useSocialTrade, SocialTradeProvider } from '@/contexts/SocialTradeContext';
import { useUnifiedSetupContext } from '@/contexts/UnifiedSetupContext';
import { usePolicyValidation } from '@/hooks/usePolicyValidation';
import { saltApi, NarrativeSuggestion } from '@/lib/api';

interface SocialTradingTabProps {
  accountId: string | null;
  maxLeverage: number;
  availableBalance: number;
  accountHealth?: number;
  onTradeSuccess?: () => void;
  walletAddress?: string;
}

// Inner component that uses the context
function SocialTradingContent({
  accountId,
  maxLeverage,
  availableBalance,
  accountHealth,
  onTradeSuccess,
  walletAddress,
}: SocialTradingTabProps) {
  const {
    selectedTweet,
    selectTweet,
    clearSelection,
    customNarrative,
    setCustomNarrative,
    suggestion,
    isGenerating,
    generateFromTweet,
    generateFromCustom,
    clearSuggestion,
    stakeUsd,
    leverage,
    setStakeUsd,
    setLeverage,
    updateAssetWeight,
    removeAsset,
    applyBetaWeights,
  } = useSocialTrade();

  // Use unified setup context
  // On the robo page, we assume setup (steps 1-5) is already complete
  // Users only need to connect X here
  const {
    isXConnected,
    isConnectingX,
    connectX,
  } = useUnifiedSetupContext();

  // Policy validation for real risk limits
  const {
    policy: policyLimits,
    todayNotional,
  } = usePolicyValidation(accountId);

  // Tweet feed state
  const [tweets, setTweets] = useState<CryptoTweet[]>([]);
  const [isLoadingTweets, setIsLoadingTweets] = useState(true);
  const [feedSource, setFeedSource] = useState<'api' | 'cache'>('api');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Fetch real tweets from API, fallback to mock
  const fetchTweets = useCallback(async () => {
    setIsLoadingTweets(true);
    try {
      const res = await fetch('/api/twitter/feed?limit=100');
      const data = await res.json();
      if (data.tweets && data.tweets.length > 0) {
        setTweets(data.tweets);
        setFeedSource(data.source || 'api');
      } else {
        setTweets([]);
        setFeedSource('api');
      }
    } catch (err) {
      console.error('Failed to fetch tweets:', err);
      setTweets([]);
      setFeedSource('api');
    } finally {
      setIsLoadingTweets(false);
    }
  }, []);

  // Fetch tweets on mount and set up refresh interval
  useEffect(() => {
    fetchTweets();
    const interval = setInterval(fetchTweets, 2 * 60 * 1000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [fetchTweets]);

  // Handle Bullish button
  const handleBullish = useCallback((tweet: CryptoTweet) => {
    generateFromTweet(tweet, 'long');
  }, [generateFromTweet]);

  // Handle Bearish button
  const handleBearish = useCallback((tweet: CryptoTweet) => {
    generateFromTweet(tweet, 'short');
  }, [generateFromTweet]);

  // Handle Select button
  const handleSelect = useCallback((tweet: CryptoTweet) => {
    selectTweet(tweet);
  }, [selectTweet]);

  // Handle trade execution
  const handleExecute = useCallback(async () => {
    if (!accountId || !suggestion) return;

    setIsExecuting(true);
    setExecuteError(null);

    try {
      const stake = parseFloat(stakeUsd) || 100;

      await saltApi.executePairTrade(accountId, {
        longAssets: suggestion.longAssets.filter(a => a.weight > 0),
        shortAssets: suggestion.shortAssets.filter(a => a.weight > 0),
        stakeUsd: stake,
        leverage,
      });

      // Clear suggestion after successful trade
      clearSuggestion();
      clearSelection();

      // Notify parent
      onTradeSuccess?.();
    } catch (err) {
      console.error('Trade execution failed:', err);
      setExecuteError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setIsExecuting(false);
    }
  }, [accountId, suggestion, stakeUsd, leverage, clearSuggestion, clearSelection, onTradeSuccess]);

  // KOL groups for the two columns
  const KOL_LEFT = ['CryptoHayes', 'Pentosh1', 'DefiIgnas'];
  const KOL_RIGHT = ['aixbt_agent', 'tier10k', 'MustStopMurad'];

  // No header needed - columns have their own titles
  const header = null;

  // Left column — Macro & Narratives (CryptoHayes, Pentosh1, DefiIgnas)
  const leftColumn = (
    <TwitterFeedColumn
      title="Macro & Narratives"
      kols={KOL_LEFT}
      tweets={tweets}
      isLoading={isLoadingTweets}
      selectedTweetId={selectedTweet?.id}
      onBullish={handleBullish}
      onBearish={handleBearish}
      onSelect={handleSelect}
      onRefresh={fetchTweets}
    />
  );

  // Center column — Your Narrative
  const centerColumn = (
    <div className="h-full overflow-hidden">
      <ColumnHeader title="Your Narrative" />
      <CenterPanel
        selectedTweet={selectedTweet}
        onClearSelection={clearSelection}
        customNarrative={customNarrative}
        onNarrativeChange={setCustomNarrative}
        onGenerateTrade={generateFromCustom}
        isGenerating={isGenerating}
      />
    </div>
  );

  // Right column — Alpha & Signals (aixbt_agent, tier10k, MustStopMurad)
  const rightColumn = (
    <TwitterFeedColumn
      title="Alpha & Signals"
      kols={KOL_RIGHT}
      tweets={tweets}
      isLoading={isLoadingTweets}
      selectedTweetId={selectedTweet?.id}
      onBullish={handleBullish}
      onBearish={handleBearish}
      onSelect={handleSelect}
      onRefresh={fetchTweets}
    />
  );

  // Strategy Info panel - shows above trade controls
  const strategyInfoPanel = (
    <StrategyInfoTab
      suggestion={suggestion}
      todayNotional={todayNotional}
      maxDailyNotional={policyLimits?.maxDailyNotionalUsd || 10000}
      accountHealth={accountHealth}
      availableBalance={availableBalance}
      maxLeverage={maxLeverage}
      onUseBetaRatio={applyBetaWeights}
    />
  );

  // Bottom panel - Trade controls
  // On this page, setup is already complete - only X connection is needed
  const bottomPanel = (
    <TradeControlPanel
      suggestion={suggestion}
      stakeUsd={stakeUsd}
      leverage={leverage}
      maxLeverage={maxLeverage}
      availableBalance={availableBalance}
      isGenerating={isGenerating}
      isExecuting={isExecuting}
      onStakeChange={setStakeUsd}
      onLeverageChange={setLeverage}
      onExecute={handleExecute}
      onClear={clearSuggestion}
      accountHealth={accountHealth}
      isSetupComplete={isXConnected}
      isRunningSetup={isConnectingX}
      onConnectToTrade={connectX}
      isXConnectionOnly={true}
      onUpdateWeight={updateAssetWeight}
      onRemoveAsset={removeAsset}
    />
  );

  return (
    <SocialTradingLayout
      header={header}
      leftColumn={leftColumn}
      centerColumn={centerColumn}
      rightColumn={rightColumn}
      bottomPanel={bottomPanel}
      strategyInfoPanel={strategyInfoPanel}
    />
  );
}

// Wrapper component that provides context
export function SocialTradingTab(props: SocialTradingTabProps) {
  return (
    <SocialTradeProvider>
      <SocialTradingContent {...props} />
    </SocialTradeProvider>
  );
}
