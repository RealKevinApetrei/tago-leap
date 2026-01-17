'use client';

import { TweetCard, type CryptoTweet } from './TweetCard';
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
    <div className="flex flex-col h-full items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-md space-y-5">
        {/* Title */}
        <h2 className="text-2xl font-light text-white/90 text-center">
          What are you thinking?
        </h2>

        {/* Custom Narrative Input */}
        <div>
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
          <div className="flex items-center justify-end mt-2 text-xs text-white/40">
            <span>{customNarrative.length}/500</span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerateTrade}
          disabled={!hasNarrative || isGenerating}
          className={`
            w-full h-12 text-base font-semibold rounded-xl transition-all
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

        {/* Unselect Post Button */}
        <button
          onClick={onClearSelection}
          className="w-full py-3 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
        >
          Unselect post
        </button>
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
