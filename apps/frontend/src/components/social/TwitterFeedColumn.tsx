'use client';

import { TweetCard, type CryptoTweet, type TweetCategory } from './TweetCard';
import { ColumnHeader } from './SocialTradingLayout';

interface TwitterFeedColumnProps {
  title: string;
  category: TweetCategory;
  tweets: CryptoTweet[];
  isLoading: boolean;
  selectedTweetId?: string;
  onBullish: (tweet: CryptoTweet) => void;
  onBearish: (tweet: CryptoTweet) => void;
  onSelect: (tweet: CryptoTweet) => void;
  onRefresh?: () => void;
}

export function TwitterFeedColumn({
  title,
  category,
  tweets,
  isLoading,
  selectedTweetId,
  onBullish,
  onBearish,
  onSelect,
  onRefresh,
}: TwitterFeedColumnProps) {
  const filteredTweets = tweets.filter(t => t.category === category);

  return (
    <div className="flex flex-col h-full">
      <ColumnHeader
        title={title}
        badge={filteredTweets.length.toString()}
        action={
          onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white/40 hover:text-white transition-colors"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : filteredTweets.length === 0 ? (
          <EmptyState category={category} />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredTweets.map((tweet) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                isSelected={tweet.id === selectedTweetId}
                onBullish={onBullish}
                onBearish={onBearish}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
              <div className="flex gap-2 mt-3">
                <div className="h-8 bg-white/10 rounded flex-1" />
                <div className="h-8 bg-white/10 rounded flex-1" />
                <div className="h-8 bg-white/10 rounded flex-1" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ category }: { category: TweetCategory }) {
  const categoryLabels: Record<TweetCategory, string> = {
    ai: 'AI & Tech',
    meme: 'Meme Coins',
    defi: 'DeFi',
    l1: 'Layer 1',
    gaming: 'Gaming',
    infrastructure: 'Infrastructure',
    other: 'Other',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
        <TweetIcon className="w-6 h-6 text-white/30" />
      </div>
      <h3 className="text-sm font-medium text-white/60">No {categoryLabels[category]} tweets</h3>
      <p className="mt-1 text-xs text-white/40">
        Check back soon for new posts
      </p>
    </div>
  );
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function TweetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
