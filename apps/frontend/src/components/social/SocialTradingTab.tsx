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
import { XListSelector, type CategoryFilter } from './XListSelector';
import { useSocialTrade, SocialTradeProvider } from '@/contexts/SocialTradeContext';
import { useUnifiedSetupContext } from '@/contexts/UnifiedSetupContext';
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
  } = useSocialTrade();

  // Use unified setup context
  // On the robo page, we assume setup (steps 1-5) is already complete
  // Users only need to connect X here
  const {
    xAccount,
    isXConnected,
    isConnectingX,
    connectX,
  } = useUnifiedSetupContext();

  // Twitter lists state
  const [xLists, setXLists] = useState<{ id: string; name: string; memberCount: number }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // Tweet feed state
  const [tweets, setTweets] = useState<CryptoTweet[]>([]);
  const [isLoadingTweets, setIsLoadingTweets] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('trending');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Fetch X lists when connected
  useEffect(() => {
    if (!xAccount || !walletAddress) return;

    const fetchLists = async () => {
      setIsLoadingLists(true);
      try {
        const response = await fetch(`/api/twitter/lists?wallet=${walletAddress}`);
        const data = await response.json();
        setXLists(data.lists || []);
      } catch (err) {
        console.error('Failed to fetch lists:', err);
      } finally {
        setIsLoadingLists(false);
      }
    };

    fetchLists();
  }, [xAccount, walletAddress]);

  // Fetch tweets
  useEffect(() => {
    const fetchTweets = async () => {
      setIsLoadingTweets(true);
      setFeedError(null);

      try {
        const params = new URLSearchParams();
        if (selectedListId) params.set('listId', selectedListId);

        const response = await fetch(`/api/twitter/feed?${params.toString()}`, {
          headers: walletAddress ? { Authorization: `Bearer ${walletAddress}` } : {},
        });

        const data = await response.json();

        if (data.error && !data.tweets?.length) {
          setFeedError(data.error);
        }

        setTweets(data.tweets || []);
      } catch (err) {
        console.error('Failed to fetch tweets:', err);
        setFeedError('Failed to load tweets');
      } finally {
        setIsLoadingTweets(false);
      }
    };

    fetchTweets();
  }, [selectedListId, walletAddress]);

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

  // Header with list selector and category filters (only when X connected)
  const header = isXConnected ? (
    <div className="flex items-center justify-end px-4 py-3">
      <div className="flex items-center gap-3">
        <XListSelector
          lists={xLists}
          selectedListId={selectedListId}
          onSelect={setSelectedListId}
          isLoading={isLoadingLists}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        {feedError && (
          <span className="px-2 py-1 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg">
            Mock Data
          </span>
        )}
      </div>
    </div>
  ) : null;

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

  // Center column - Trending or Your Narrative
  const centerColumn = (
    <div className="h-full overflow-hidden">
      <ColumnHeader title={selectedTweet ? 'Your Narrative' : 'Trending'} />
      <CenterPanel
        tweets={getTrendingTweets()}
        isLoading={isLoadingTweets}
        selectedTweet={selectedTweet}
        onClearSelection={clearSelection}
        customNarrative={customNarrative}
        onNarrativeChange={setCustomNarrative}
        onGenerateTrade={generateFromCustom}
        isGenerating={isGenerating}
        onBullish={handleBullish}
        onBearish={handleBearish}
        onSelect={handleSelect}
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
