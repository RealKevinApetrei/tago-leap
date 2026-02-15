import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoTweets, KOL_GROUP_LEFT, KOL_GROUP_RIGHT } from '@/lib/api-server/clients/twitterClient';
import { serverEnv } from '@/lib/api-server/env';

// Cache for tweets (in-memory, resets on serverless cold start)
let tweetCache: {
  tweets: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 2 * 60 * 1000; // 2 minute cache

/**
 * GET /api/twitter/feed
 * Fetches real-time crypto tweets from monitored KOLs via twitterapi.io advanced_search
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const group = searchParams.get('group'); // 'left' | 'right' | null (all)
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    if (!serverEnv.TWITTER_STREAM_API_KEY) {
      return NextResponse.json({
        tweets: [],
        source: 'api',
        message: 'TWITTER_STREAM_API_KEY not configured',
      });
    }

    // Check cache
    if (tweetCache && Date.now() - tweetCache.timestamp < CACHE_TTL) {
      let tweets = tweetCache.tweets;

      if (group === 'left') {
        tweets = tweets.filter((t: any) => (KOL_GROUP_LEFT as readonly string[]).includes(t.authorUsername));
      } else if (group === 'right') {
        tweets = tweets.filter((t: any) => (KOL_GROUP_RIGHT as readonly string[]).includes(t.authorUsername));
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

    // Filter by KOL group if specified
    let filteredTweets = tweets;
    if (group === 'left') {
      filteredTweets = tweets.filter(t => (KOL_GROUP_LEFT as readonly string[]).includes(t.authorUsername));
    } else if (group === 'right') {
      filteredTweets = tweets.filter(t => (KOL_GROUP_RIGHT as readonly string[]).includes(t.authorUsername));
    }

    return NextResponse.json({
      tweets: filteredTweets.slice(0, limit),
      source: 'api',
      total: tweets.length,
    });
  } catch (error) {
    console.error('[twitter/feed] Error fetching tweets:', error);

    return NextResponse.json({
      tweets: [],
      source: 'api',
      error: 'Failed to fetch live tweets',
    });
  }
}
