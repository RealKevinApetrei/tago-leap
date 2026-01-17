'use client';

import { useState } from 'react';
import { TweetCard, SelectedTweetCard, type CryptoTweet } from './TweetCard';
import { Button } from '@/components/ui/Button';

interface CenterPanelProps {
  // Default mode - show trending tweets
  tweets: CryptoTweet[];
  isLoading: boolean;

  // Selected mode
  selectedTweet: CryptoTweet | null;
  onClearSelection: () => void;

  // Custom narrative input
  customNarrative: string;
  onNarrativeChange: (value: string) => void;
  onGenerateTrade: () => void;
  isGenerating: boolean;

  // Tweet actions
  onBullish: (tweet: CryptoTweet) => void;
  onBearish: (tweet: CryptoTweet) => void;
  onSelect: (tweet: CryptoTweet) => void;
}

export function CenterPanel({
  tweets,
  isLoading,
  selectedTweet,
  onClearSelection,
  customNarrative,
  onNarrativeChange,
  onGenerateTrade,
  isGenerating,
  onBullish,
  onBearish,
  onSelect,
}: CenterPanelProps) {
  // If a tweet is selected, show the custom input panel
  if (selectedTweet) {
    return (
      <CustomInputPanel
        selectedTweet={selectedTweet}
        onClearSelection={onClearSelection}
        customNarrative={customNarrative}
        onNarrativeChange={onNarrativeChange}
        onGenerateTrade={onGenerateTrade}
        isGenerating={isGenerating}
      />
    );
  }

  // Default: show trending/hot tweets
  return (
    <DefaultFeed
      tweets={tweets}
      isLoading={isLoading}
      onBullish={onBullish}
      onBearish={onBearish}
      onSelect={onSelect}
    />
  );
}

/**
 * Default Feed - Trending/Hot Tweets
 */
function DefaultFeed({
  tweets,
  isLoading,
  onBullish,
  onBearish,
  onSelect,
}: {
  tweets: CryptoTweet[];
  isLoading: boolean;
  onBullish: (tweet: CryptoTweet) => void;
  onBearish: (tweet: CryptoTweet) => void;
  onSelect: (tweet: CryptoTweet) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <LoadingSpinner className="w-8 h-8 text-[#E8FF00]" />
        <p className="mt-4 text-sm text-white/50">Loading trending tweets...</p>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <TrendingIcon className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-lg font-medium text-white/80">No trending tweets</h3>
        <p className="mt-2 text-sm text-white/50 max-w-xs">
          Connect your X account to see trending crypto tweets from your timeline
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          onBullish={onBullish}
          onBearish={onBearish}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/**
 * Custom Input Panel - When a tweet is selected
 */
function CustomInputPanel({
  selectedTweet,
  onClearSelection,
  customNarrative,
  onNarrativeChange,
  onGenerateTrade,
  isGenerating,
}: {
  selectedTweet: CryptoTweet;
  onClearSelection: () => void;
  customNarrative: string;
  onNarrativeChange: (value: string) => void;
  onGenerateTrade: () => void;
  isGenerating: boolean;
}) {
  const hasNarrative = customNarrative.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/80">Custom Trade</h3>
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Selected Tweet Context */}
      <div className="flex-shrink-0 p-4">
        <SelectedTweetCard tweet={selectedTweet} onDeselect={onClearSelection} />
      </div>

      {/* Custom Narrative Input */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <label className="block text-center mb-4">
            <span className="text-2xl font-light text-white/90">What are you thinking today?</span>
          </label>
          <textarea
            value={customNarrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            placeholder="e.g., I think this is overhyped, want to fade the pump..."
            className="w-full h-32 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1]
              text-white placeholder-white/30 resize-none
              focus:outline-none focus:ring-2 focus:ring-[#E8FF00]/50 focus:border-[#E8FF00]/50
              transition-all"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-white/40">
            <span>Use the tweet above as context for your trade idea</span>
            <span>{customNarrative.length}/500</span>
          </div>

          {/* Generate Button */}
          <Button
            onClick={onGenerateTrade}
            disabled={!hasNarrative || isGenerating}
            className={`
              w-full mt-4 h-12 text-base font-semibold rounded-xl transition-all
              ${hasNarrative && !isGenerating
                ? 'bg-[#E8FF00] text-black hover:bg-[#d4eb00]'
                : 'bg-white/[0.1] text-white/40 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                Generating Trade...
              </span>
            ) : (
              'Generate Trade'
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06] bg-black/40">
        <p className="text-xs text-white/40 text-center mb-3">
          Or use quick actions based on the tweet sentiment
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onNarrativeChange(`Based on this tweet, I'm bullish on ${selectedTweet.mentionedAssets.join(', ')}`);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
          >
            I'm Bullish
          </button>
          <button
            onClick={() => {
              onNarrativeChange(`Based on this tweet, I'm bearish and want to short ${selectedTweet.mentionedAssets.join(', ')}`);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            I'm Bearish
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </svg>
  );
}
