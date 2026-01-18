'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export type TweetCategory = 'ai' | 'meme' | 'defi' | 'l1' | 'gaming' | 'infrastructure' | 'other';
export type TweetSentiment = 'bullish' | 'bearish' | 'neutral';

export interface CryptoTweet {
  id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies?: number;
  };
  mentionedAssets: string[];
  category: TweetCategory;
  sentiment?: TweetSentiment;
  media?: { url: string; type: 'photo' | 'video' }[];
}

interface TweetCardProps {
  tweet: CryptoTweet;
  onBullish?: (tweet: CryptoTweet) => void;
  onBearish?: (tweet: CryptoTweet) => void;
  onSelect?: (tweet: CryptoTweet) => void;
  isSelected?: boolean;
  compact?: boolean;
}

const CATEGORY_STYLES: Record<TweetCategory, { bg: string; text: string; label: string }> = {
  ai: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'AI' },
  meme: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Meme' },
  defi: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'DeFi' },
  l1: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'L1' },
  gaming: { bg: 'bg-pink-500/20', text: 'text-pink-400', label: 'Gaming' },
  infrastructure: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Infra' },
  other: { bg: 'bg-white/10', text: 'text-white/60', label: 'Other' },
};

export function TweetCard({
  tweet,
  onBullish,
  onBearish,
  onSelect,
  isSelected = false,
  compact = false,
}: TweetCardProps) {
  const categoryStyle = CATEGORY_STYLES[tweet.category];
  const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true });

  // Highlight mentioned assets in content
  const highlightedContent = highlightAssets(tweet.content, tweet.mentionedAssets);

  return (
    <div
      className={`
        relative p-4 transition-all duration-200
        ${isSelected
          ? 'bg-[#E8FF00]/10 border-l-2 border-[#E8FF00]'
          : 'hover:bg-white/[0.03] border-l-2 border-transparent'
        }
        ${compact ? 'py-3' : ''}
      `}
    >
      {/* Header: Avatar, Name, Username, Time, Category */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={tweet.authorAvatar || `https://unavatar.io/twitter/${tweet.authorUsername}`}
            alt={tweet.authorDisplayName}
            className="w-10 h-10 rounded-full bg-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tweet.authorDisplayName}&background=333&color=fff`;
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">
              {tweet.authorDisplayName}
            </span>
            <XLogoIcon className="w-3.5 h-3.5 text-white/40" />
            <span className="text-white/40 text-sm">@{tweet.authorUsername}</span>
            <span className="text-white/30 text-sm">{timeAgo}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
              {categoryStyle.label}
            </span>
          </div>

          {/* Tweet Content */}
          <div
            className="mt-2 text-white/90 text-sm leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />

          {/* Mentioned Assets Pills */}
          {tweet.mentionedAssets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tweet.mentionedAssets.map((asset) => (
                <span
                  key={asset}
                  className="px-2 py-0.5 text-xs font-medium rounded bg-[#E8FF00]/20 text-[#E8FF00]"
                >
                  ${asset}
                </span>
              ))}
            </div>
          )}

          {/* Media Preview */}
          {tweet.media && tweet.media.length > 0 && (
            <div className="mt-3 rounded-lg overflow-hidden border border-white/[0.06]">
              {tweet.media[0].type === 'photo' && (
                <img
                  src={tweet.media[0].url}
                  alt="Tweet media"
                  className="w-full h-auto max-h-48 object-cover"
                />
              )}
            </div>
          )}

          {/* Metrics Row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <HeartIcon className="w-3.5 h-3.5" />
              {formatNumber(tweet.metrics.likes)}
            </span>
            <span className="flex items-center gap-1">
              <RetweetIcon className="w-3.5 h-3.5" />
              {formatNumber(tweet.metrics.retweets)}
            </span>
            {tweet.metrics.replies !== undefined && (
              <span className="flex items-center gap-1">
                <ReplyIcon className="w-3.5 h-3.5" />
                {formatNumber(tweet.metrics.replies)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            <motion.button
              onClick={() => onBullish?.(tweet)}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              Bullish
            </motion.button>
            <motion.button
              onClick={() => onBearish?.(tweet)}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              Bearish
            </motion.button>
            <motion.button
              onClick={() => onSelect?.(tweet)}
              className={`
                flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors
                ${isSelected
                  ? 'bg-[#E8FF00] text-black'
                  : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white'
                }
              `}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {isSelected ? 'Selected' : 'Select'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Tweet Card for Selected Context
 */
export function SelectedTweetCard({
  tweet,
  onDeselect,
}: {
  tweet: CryptoTweet;
  onDeselect: () => void;
}) {
  const categoryStyle = CATEGORY_STYLES[tweet.category];

  return (
    <motion.div
      className="relative p-4 bg-[#E8FF00]/10 rounded-xl border border-[#E8FF00]/30"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-[#E8FF00]/5 -z-10"
        animate={{
          boxShadow: ['0 0 20px rgba(232, 255, 0, 0.1)', '0 0 30px rgba(232, 255, 0, 0.2)', '0 0 20px rgba(232, 255, 0, 0.1)'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Close Button */}
      <motion.button
        onClick={onDeselect}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        <XIcon className="w-4 h-4" />
      </motion.button>

      <div className="flex items-start gap-3 pr-8">
        <img
          src={tweet.authorAvatar || `https://unavatar.io/twitter/${tweet.authorUsername}`}
          alt={tweet.authorDisplayName}
          className="w-8 h-8 rounded-full bg-white/10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-sm">{tweet.authorDisplayName}</span>
            <XLogoIcon className="w-3 h-3 text-white/40" />
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${categoryStyle.bg} ${categoryStyle.text}`}>
              {categoryStyle.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/70 line-clamp-2">{tweet.content}</p>
          {tweet.mentionedAssets.length > 0 && (
            <motion.div
              className="flex flex-wrap gap-1 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {tweet.mentionedAssets.map((asset, index) => (
                <motion.span
                  key={asset}
                  className="px-1.5 py-0.5 text-xs font-medium rounded bg-[#E8FF00]/30 text-[#E8FF00]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  ${asset}
                </motion.span>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Helper Functions
function highlightAssets(content: string, assets: string[]): string {
  let highlighted = escapeHtml(content);

  // Highlight $TICKER mentions
  highlighted = highlighted.replace(
    /\$([A-Z0-9]+)/gi,
    '<span class="text-[#E8FF00] font-medium">$$$1</span>'
  );

  // Highlight @mentions
  highlighted = highlighted.replace(
    /@(\w+)/g,
    '<span class="text-blue-400">@$1</span>'
  );

  // Convert URLs to links
  highlighted = highlighted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>'
  );

  return highlighted;
}

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Icons
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function RetweetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
