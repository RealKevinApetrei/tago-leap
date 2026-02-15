'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TweetCard, type CryptoTweet } from './TweetCard';
import { ColumnHeader } from './SocialTradingLayout';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { ASCIILoader } from '@/components/ascii';

interface TwitterFeedColumnProps {
  title: string;
  /** KOL usernames to show in this column */
  kols: readonly string[];
  tweets: CryptoTweet[];
  isLoading: boolean;
  selectedTweetId?: string;
  onBullish: (tweet: CryptoTweet) => void;
  onBearish: (tweet: CryptoTweet) => void;
  onSelect: (tweet: CryptoTweet) => void;
  onRefresh?: () => void;
  autoScroll?: boolean;
  scrollSpeed?: number;
}

export function TwitterFeedColumn({
  title,
  kols,
  tweets,
  isLoading,
  selectedTweetId,
  onBullish,
  onBearish,
  onSelect,
  onRefresh,
  autoScroll = true,
  scrollSpeed = 30,
}: TwitterFeedColumnProps) {
  const filteredTweets = tweets.filter(t => kols.includes(t.authorUsername));

  const {
    containerRef,
    isPaused,
  } = useAutoScroll({
    speed: scrollSpeed,
    pauseOnHover: true,
    enabled: autoScroll && filteredTweets.length > 1,
  });

  return (
    <div className="flex flex-col h-full relative">
      <ColumnHeader
        title={title}
        badge={filteredTweets.length.toString()}
        action={
          <div className="flex items-center gap-2">
            {autoScroll && isPaused && filteredTweets.length > 1 && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/[0.05] rounded">
                Paused
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white/40 hover:text-white transition-colors"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      />

      {/* Top gradient fade */}
      <div className="absolute top-[44px] left-0 right-0 h-6 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {isLoading ? (
          <LoadingState />
        ) : filteredTweets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-white/[0.06] pt-2">
            <AnimatePresence mode="popLayout">
              {filteredTweets.map((tweet, index) => (
                <motion.div
                  key={tweet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <TweetCard
                    tweet={tweet}
                    isSelected={tweet.id === selectedTweetId}
                    onBullish={onBullish}
                    onBearish={onBearish}
                    onSelect={onSelect}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6">
      <ASCIILoader
        variant="dots"
        size="lg"
        color="yellow"
        text="Loading tweets..."
      />
      <div className="mt-6 space-y-3 w-full max-w-xs">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-1/2" />
              <div className="h-2 bg-white/10 rounded w-full" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
        <TweetIcon className="w-6 h-6 text-white/30" />
      </div>
      <h3 className="text-sm font-medium text-white/60">No tweets yet</h3>
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
