'use client';

import { useEffect, useState } from 'react';

// Mock tweet data for scrolling columns
const TWEETS_LEFT = [
  { user: '@whale_alert', content: '$BTC breaking ATH..', sentiment: 'bullish' as const },
  { user: '@DefiAnalyst', content: '$ETH L2 TVL surge', sentiment: 'bullish' as const },
  { user: '@CryptoNews', content: 'Fed rate decision..', sentiment: 'neutral' as const },
  { user: '@TraderX', content: '$SOL ecosystem boom', sentiment: 'bullish' as const },
  { user: '@OnChainData', content: 'Whale accumulation', sentiment: 'bullish' as const },
  { user: '@MarketWatch', content: 'Risk-on sentiment', sentiment: 'bullish' as const },
  { user: '@AlphaSeeker', content: '$AVAX subnet launch', sentiment: 'bullish' as const },
  { user: '@DeFiPulse', content: 'New ATH in DeFi TVL', sentiment: 'bullish' as const },
];

const TWEETS_RIGHT = [
  { user: '@AltSeason', content: 'AI tokens pumping', sentiment: 'bullish' as const },
  { user: '@BearWatch', content: '$DOGE momentum slow', sentiment: 'bearish' as const },
  { user: '@AlphaLeaks', content: '$LINK oracle news', sentiment: 'bullish' as const },
  { user: '@CryptoQuant', content: 'Exchange outflows', sentiment: 'bullish' as const },
  { user: '@TokenInsider', content: '$ARB airdrop buzz', sentiment: 'bullish' as const },
  { user: '@ChainMetrics', content: 'Gas fees dropping', sentiment: 'neutral' as const },
  { user: '@NFTAlerts', content: 'Blue chip floor up', sentiment: 'bullish' as const },
  { user: '@YieldFarmer', content: 'New stable yields', sentiment: 'neutral' as const },
];

interface ASCIITweetProps {
  user: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

function ASCIITweetBox({ user, content, sentiment }: ASCIITweetProps) {
  const sentimentIcon = sentiment === 'bullish' ? '▲' : sentiment === 'bearish' ? '▼' : '●';
  const sentimentClass = sentiment === 'bullish'
    ? 'text-green-400/40'
    : sentiment === 'bearish'
    ? 'text-red-400/40'
    : 'text-white/30';

  return (
    <div className="font-mono text-[9px] whitespace-nowrap mb-4">
      <div className="text-white/15">╭─────────────────────╮</div>
      <div className="text-white/15">│ <span className="text-white/25">{user.padEnd(18)}</span> │</div>
      <div className="text-white/15">│ <span className="text-white/20">{content.substring(0, 18).padEnd(18)}</span> │</div>
      <div className="text-white/15">│ <span className={sentimentClass}>{sentimentIcon} {sentiment.padEnd(15)}</span> │</div>
      <div className="text-white/15">╰─────────────────────╯</div>
    </div>
  );
}

interface TweetColumnProps {
  tweets: ASCIITweetProps[];
  direction: 'up' | 'down';
  side: 'left' | 'right';
}

function TweetColumn({ tweets, direction, side }: TweetColumnProps) {
  // Double the tweets for seamless looping
  const doubledTweets = [...tweets, ...tweets];

  return (
    <div
      className={`fixed top-0 bottom-0 ${side === 'left' ? 'left-2' : 'right-2'} w-[160px] overflow-hidden pointer-events-none z-0 hidden xl:block`}
    >
      <div className="absolute inset-0 flex flex-col items-center py-8">
        <div
          className={`flex flex-col ${direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`}
          style={{
            animationDuration: '60s',
          }}
        >
          {doubledTweets.map((tweet, i) => (
            <ASCIITweetBox key={i} {...tweet} />
          ))}
        </div>
      </div>

      {/* Fade gradients at top and bottom */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}

interface ASCIITweetColumnsProps {
  className?: string;
}

export function ASCIITweetColumns({ className }: ASCIITweetColumnsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <TweetColumn tweets={TWEETS_LEFT} direction="up" side="left" />
      <TweetColumn tweets={TWEETS_RIGHT} direction="down" side="right" />

      {/* CSS Keyframes for scrolling */}
      <style jsx global>{`
        @keyframes scroll-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        @keyframes scroll-down {
          0% {
            transform: translateY(-50%);
          }
          100% {
            transform: translateY(0);
          }
        }

        .animate-scroll-up {
          animation: scroll-up linear infinite;
        }

        .animate-scroll-down {
          animation: scroll-down linear infinite;
        }
      `}</style>
    </>
  );
}
