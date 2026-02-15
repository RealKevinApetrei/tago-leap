import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoTweets } from '@/lib/api-server/clients/twitterClient';
import { serverEnv } from '@/lib/api-server/env';

// Cache for tweets (in-memory, resets on serverless cold start)
let tweetCache: {
  tweets: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 2 * 60 * 1000; // 2 minute cache

/**
 * GET /api/twitter/feed
 * Fetches categorized crypto tweets from monitored accounts via twitterapi.io
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category'); // 'ai' | 'meme' | 'defi' | 'l1' | 'all'
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // Check if TwitterAPI.io is configured
    if (!serverEnv.TWITTER_STREAM_API_KEY) {
      return NextResponse.json({
        tweets: getMockTweets(category, limit),
        source: 'mock',
        message: 'Using mock data - TWITTER_STREAM_API_KEY not configured',
      });
    }

    // Check cache
    if (tweetCache && Date.now() - tweetCache.timestamp < CACHE_TTL) {
      let tweets = tweetCache.tweets;

      if (category && category !== 'all') {
        tweets = tweets.filter((t) => t.category === category);
      }

      return NextResponse.json({
        tweets: tweets.slice(0, limit),
        source: 'cache',
        total: tweetCache.tweets.length,
      });
    }

    // Fetch fresh tweets from all monitored accounts
    const tweets = await fetchCryptoTweets({ maxResults: 100 });

    // Update cache
    tweetCache = {
      tweets,
      timestamp: Date.now(),
    };

    // Filter by category if specified
    let filteredTweets = tweets;
    if (category && category !== 'all') {
      filteredTweets = tweets.filter((t) => t.category === category);
    }

    return NextResponse.json({
      tweets: filteredTweets.slice(0, limit),
      source: 'api',
      total: tweets.length,
    });
  } catch (error) {
    console.error('[twitter/feed] Error fetching tweets:', error);

    // Return mock data on error
    return NextResponse.json({
      tweets: getMockTweets(category, limit),
      source: 'mock',
      error: 'Failed to fetch live tweets, showing mock data',
    });
  }
}

// Mock data for development/fallback
function getMockTweets(category: string | null, limit: number) {
  const mockTweets = [
    {
      id: 'mock-1',
      authorUsername: 'tier10k',
      authorDisplayName: 'Tier10K',
      authorAvatar: '',
      content: '$BTC breaking through resistance. This is the move we\'ve been waiting for. Target $120k by end of Q1.',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      metrics: { likes: 1520, retweets: 342, replies: 89 },
      mentionedAssets: ['BTC'],
      category: 'l1' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-2',
      authorUsername: 'DefiIgnas',
      authorDisplayName: 'Ignas | DeFi',
      authorAvatar: '',
      content: '$TAO and $RENDER leading the AI narrative again. The convergence of AI and crypto is inevitable.',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      metrics: { likes: 2340, retweets: 521, replies: 156 },
      mentionedAssets: ['TAO', 'RENDER'],
      category: 'ai' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-3',
      authorUsername: 'aixbt_agent',
      authorDisplayName: 'aixbt',
      authorAvatar: '',
      content: 'Everyone is bullish on $PEPE again. Meme sector rotating.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      metrics: { likes: 856, retweets: 145, replies: 234 },
      mentionedAssets: ['PEPE'],
      category: 'meme' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-4',
      authorUsername: 'CryptoHayes',
      authorDisplayName: 'Arthur Hayes',
      authorAvatar: '',
      content: '$SOL ecosystem is on fire. $JUP, $BONK all moving. Solana summer 2.0?',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      metrics: { likes: 3210, retweets: 678, replies: 312 },
      mentionedAssets: ['SOL', 'JUP', 'BONK'],
      category: 'l1' as const,
      sentiment: 'bullish' as const,
    },
  ];

  let filtered = mockTweets;
  if (category && category !== 'all') {
    filtered = mockTweets.filter((t) => t.category === category);
  }

  return filtered.slice(0, limit);
}
