'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SocialTradingLayout,
  ColumnHeader,
} from './SocialTradingLayout';
import { type CryptoTweet, type TweetCategory } from './TweetCard';
import { TwitterFeedColumn } from './TwitterFeedColumn';
import { CenterPanel } from './CenterPanel';
import { TradeControlPanel } from './TradeControlPanel';
import { StrategyInfoTab } from './StrategyInfoTab';
import { useSocialTrade, SocialTradeProvider } from '@/contexts/SocialTradeContext';
import { useUnifiedSetupContext } from '@/contexts/UnifiedSetupContext';
import { saltApi, NarrativeSuggestion } from '@/lib/api';
import { MOCK_TWEETS, getShuffledTweets } from '@/data/mockTweets';

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
  } = useSocialTrade();

  // Use unified setup context
  // On the robo page, we assume setup (steps 1-5) is already complete
  // Users only need to connect X here
  const {
    isXConnected,
    isConnectingX,
    connectX,
  } = useUnifiedSetupContext();

  // Tweet feed state
  const [tweets, setTweets] = useState<CryptoTweet[]>([]);
  const [isLoadingTweets, setIsLoadingTweets] = useState(true);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Load mock tweets (demo mode)
  useEffect(() => {
    setIsLoadingTweets(true);

    // Simulate loading delay for realism
    const timer = setTimeout(() => {
      setTweets(getShuffledTweets());
      setIsLoadingTweets(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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

  // Filter tweets by category
  const getTweetsByCategory = (category: TweetCategory): CryptoTweet[] => {
    return tweets.filter(t => t.category === category);
  };

  const getTrendingTweets = (): CryptoTweet[] => {
    // Sort by engagement and return top tweets
    return [...tweets]
      .sort((a, b) => (b.metrics.likes + b.metrics.retweets * 2) - (a.metrics.likes + a.metrics.retweets * 2))
      .slice(0, 20);
  };

  // No header needed - columns have their own titles
  const header = null;

  // Left column - AI tweets
  const leftColumn = (
    <TwitterFeedColumn
      title="AI & Tech"
      category="ai"
      tweets={tweets}
      isLoading={isLoadingTweets}
      selectedTweetId={selectedTweet?.id}
      onBullish={handleBullish}
      onBearish={handleBearish}
      onSelect={handleSelect}
    />
  );

  // Center column - Always "Your Narrative"
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

  // Right column - Meme/DeFi tweets
  const rightColumn = (
    <TwitterFeedColumn
      title="Meme & DeFi"
      category="meme"
      tweets={[...getTweetsByCategory('meme'), ...getTweetsByCategory('defi')]}
      isLoading={isLoadingTweets}
      selectedTweetId={selectedTweet?.id}
      onBullish={handleBullish}
      onBearish={handleBearish}
      onSelect={handleSelect}
    />
  );

  // Strategy Info panel - shows above trade controls
  const strategyInfoPanel = (
    <StrategyInfoTab
      suggestion={suggestion}
      todayNotional={0}
      maxDailyNotional={100000}
      accountHealth={accountHealth}
      availableBalance={availableBalance}
      maxLeverage={maxLeverage}
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
