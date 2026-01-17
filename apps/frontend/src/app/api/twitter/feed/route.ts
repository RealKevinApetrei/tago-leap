import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoTweets } from '@/lib/api-server/clients/twitterClient';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import { serverEnv } from '@/lib/api-server/env';

// Cache for tweets (in-memory, resets on serverless cold start)
let tweetCache: {
  tweets: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * GET /api/twitter/feed
 * Fetches categorized crypto tweets
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category'); // 'ai' | 'meme' | 'defi' | 'l1' | 'all'
  const listId = searchParams.get('listId');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // Get wallet from Authorization header (optional)
    const authHeader = request.headers.get('authorization');
    let userAccessToken: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      const walletAddress = authHeader.slice(7);

      // Look up user's X tokens
      const supabase = getSupabaseAdmin();
      const { data: tokenData } = await supabase
        .from('x_tokens')
        .select('access_token, expires_at, refresh_token')
        .eq('user_wallet', walletAddress.toLowerCase())
        .single();

      if (tokenData) {
        // Check if token is expired
        const expiresAt = new Date(tokenData.expires_at);
        if (expiresAt > new Date()) {
          userAccessToken = tokenData.access_token;
        }
        // TODO: Implement token refresh if expired
      }
    }

    // Check if Twitter API is configured
    if (!serverEnv.X_BEARER_TOKEN && !userAccessToken) {
      // Return mock data if no API configured
      return NextResponse.json({
        tweets: getMockTweets(category, limit),
        source: 'mock',
        message: 'Using mock data - X API not configured',
      });
    }

    // Check cache (only for non-list requests)
    if (!listId && tweetCache && Date.now() - tweetCache.timestamp < CACHE_TTL) {
      let tweets = tweetCache.tweets;

      // Filter by category if specified
      if (category && category !== 'all') {
        tweets = tweets.filter((t) => t.category === category);
      }

      return NextResponse.json({
        tweets: tweets.slice(0, limit),
        source: 'cache',
      });
    }

    // Fetch fresh tweets
    const tweets = await fetchCryptoTweets({
      maxResults: 100,
      listId: listId || undefined,
      userAccessToken,
    });

    // Update cache
    if (!listId) {
      tweetCache = {
        tweets,
        timestamp: Date.now(),
      };
    }

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
      content: '$TAO and $RENDER leading the AI narrative again. The convergence of AI and crypto is inevitable. Stack accordingly.',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      metrics: { likes: 2340, retweets: 521, replies: 156 },
      mentionedAssets: ['TAO', 'RENDER'],
      category: 'ai' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-3',
      authorUsername: 'inversebrah',
      authorDisplayName: 'inversebrah',
      authorAvatar: '',
      content: 'Everyone is bullish on $PEPE again. You know what that means... Fade incoming.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      metrics: { likes: 856, retweets: 145, replies: 234 },
      mentionedAssets: ['PEPE'],
      category: 'meme' as const,
      sentiment: 'bearish' as const,
    },
    {
      id: 'mock-4',
      authorUsername: 'CryptoKaleo',
      authorDisplayName: 'K A L E O',
      authorAvatar: '',
      content: '$SOL ecosystem is on fire. $JUP, $BONK, $WIF all moving. Solana summer 2.0?',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      metrics: { likes: 3210, retweets: 678, replies: 312 },
      mentionedAssets: ['SOL', 'JUP', 'BONK', 'WIF'],
      category: 'l1' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-5',
      authorUsername: 'coaborozdogan',
      authorDisplayName: 'Cobo',
      authorAvatar: '',
      content: '$AAVE TVL hitting new ATH. DeFi isn\'t dead, it was just resting. $UNI and $CRV also looking strong.',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      metrics: { likes: 1890, retweets: 423, replies: 178 },
      mentionedAssets: ['AAVE', 'UNI', 'CRV'],
      category: 'defi' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-6',
      authorUsername: 'Route2FI',
      authorDisplayName: 'Route 2 FI',
      authorAvatar: '',
      content: '$VIRTUAL is the next big AI agent play. 100x potential from here. Not financial advice but also financial advice.',
      createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      metrics: { likes: 4560, retweets: 890, replies: 456 },
      mentionedAssets: ['VIRTUAL'],
      category: 'ai' as const,
      sentiment: 'bullish' as const,
    },
    {
      id: 'mock-7',
      authorUsername: 'SmartContracter',
      authorDisplayName: 'Smart Contracter',
      authorAvatar: '',
      content: '$ARB and $OP both looking weak. L2s are getting crushed by the new L1 meta. Time to rotate?',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      metrics: { likes: 1234, retweets: 267, replies: 189 },
      mentionedAssets: ['ARB', 'OP'],
      category: 'infrastructure' as const,
      sentiment: 'bearish' as const,
    },
    {
      id: 'mock-8',
      authorUsername: 'CryptoCred',
      authorDisplayName: 'Cred',
      authorAvatar: '',
      content: 'Simple thesis: Long $ETH, short $DOGE. Quality vs meme. The ratio will catch up eventually.',
      createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
      metrics: { likes: 2780, retweets: 534, replies: 267 },
      mentionedAssets: ['ETH', 'DOGE'],
      category: 'l1' as const,
      sentiment: 'neutral' as const,
    },
  ];

  // Filter by category if specified
  let filtered = mockTweets;
  if (category && category !== 'all') {
    filtered = mockTweets.filter((t) => t.category === category);
  }

  return filtered.slice(0, limit);
}
