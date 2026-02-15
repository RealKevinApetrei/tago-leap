import { serverEnv } from '../env';

/**
 * TwitterAPI.io client for fetching real-time crypto tweets
 * Uses the twitter-stream monitoring service + user tweets API
 */

// Top crypto accounts we monitor (up to 6 on Starter Plan)
export const MONITORED_ACCOUNTS = [
  'aixbt_agent',
  'CryptoHayes',
  'tier10k',
  'DefiIgnas',
  'Pentosh1',
  'MustStopMurad',
];

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
    replies: number;
  };
  mentionedAssets: string[];
  category: 'ai' | 'meme' | 'defi' | 'l1' | 'gaming' | 'infrastructure' | 'other';
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  media?: { url: string; type: 'photo' | 'video' }[];
}

interface TwitterApiTweet {
  type: string;
  id: string;
  url: string;
  text: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  isReply: boolean;
  author: {
    userName: string;
    name: string;
    profilePicture: string;
    id: string;
    followers: number;
  };
  extendedEntities?: {
    media?: Array<{
      type: string;
      media_url_https?: string;
      url?: string;
    }>;
  };
}

interface TwitterApiResponse {
  status: string;
  code: number;
  msg: string;
  data: {
    tweets: TwitterApiTweet[];
    has_next_page: boolean;
    next_cursor: string;
    pin_tweet: TwitterApiTweet | null;
  };
}

const API_BASE = 'https://api.twitterapi.io';

/**
 * Fetch latest tweets from a single user via twitterapi.io
 */
async function fetchUserTweets(username: string): Promise<TwitterApiTweet[]> {
  const apiKey = serverEnv.TWITTER_STREAM_API_KEY;
  if (!apiKey) {
    throw new Error('TWITTER_STREAM_API_KEY is not configured');
  }

  const url = `${API_BASE}/twitter/user/last_tweets?userName=${encodeURIComponent(username)}`;

  const res = await fetch(url, {
    headers: { 'X-API-Key': apiKey },
    next: { revalidate: 60 }, // Cache for 60 seconds in Next.js
  });

  if (!res.ok) {
    throw new Error(`TwitterAPI.io error: ${res.status} ${res.statusText}`);
  }

  const json: TwitterApiResponse = await res.json();

  if (json.status !== 'success') {
    throw new Error(`TwitterAPI.io error: ${json.msg}`);
  }

  return (json.data?.tweets || []).filter(t => !t.isReply);
}

/**
 * Fetch recent tweets from all monitored crypto accounts
 */
export async function fetchCryptoTweets(options?: {
  maxResults?: number;
  accounts?: string[];
}): Promise<CryptoTweet[]> {
  const { maxResults = 50, accounts = MONITORED_ACCOUNTS } = options || {};

  // Fetch tweets from all accounts in parallel
  const results = await Promise.allSettled(
    accounts.map(username => fetchUserTweets(username))
  );

  const allTweets: TwitterApiTweet[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTweets.push(...result.value);
    } else {
      console.warn('[twitterClient] Failed to fetch from account:', result.reason);
    }
  }

  // Transform to our format
  const cryptoTweets: CryptoTweet[] = allTweets.map(tweet => {
    const mentionedAssets = extractAssets(tweet.text);
    const category = categorizeFromAssets(mentionedAssets, tweet.text);
    const media = extractMedia(tweet);

    return {
      id: tweet.id,
      authorUsername: tweet.author?.userName || 'unknown',
      authorDisplayName: tweet.author?.name || 'Unknown',
      authorAvatar: tweet.author?.profilePicture || '',
      content: tweet.text,
      createdAt: parseTwitterDate(tweet.createdAt),
      metrics: {
        likes: tweet.likeCount || 0,
        retweets: tweet.retweetCount || 0,
        replies: tweet.replyCount || 0,
      },
      mentionedAssets,
      category,
      sentiment: undefined,
      media,
    };
  });

  // Sort by date (newest first)
  cryptoTweets.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return cryptoTweets.slice(0, maxResults);
}

/**
 * Parse Twitter's date format ("Sun Feb 15 15:39:31 +0000 2026") to ISO string
 */
function parseTwitterDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Extract media from tweet
 */
function extractMedia(tweet: TwitterApiTweet): { url: string; type: 'photo' | 'video' }[] | undefined {
  const media = tweet.extendedEntities?.media;
  if (!media || media.length === 0) return undefined;

  return media
    .filter(m => m.media_url_https || m.url)
    .map(m => ({
      url: m.media_url_https || m.url || '',
      type: (m.type === 'video' || m.type === 'animated_gif' ? 'video' : 'photo') as 'photo' | 'video',
    }));
}

// ========================================
// Legacy OAuth stubs (kept for auth route compatibility)
// These are not used by the feed - feed uses twitterapi.io directly
// ========================================

export function validateXConfig(): string | null {
  return 'X OAuth is not configured. Feed uses TwitterAPI.io instead.';
}

export function getAuthUrl(_state: string, _codeChallenge: string): string {
  return '';
}

export async function exchangeCodeForTokens(
  _code: string,
  _codeVerifier: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  throw new Error('X OAuth not configured');
}

export async function getUserInfo(_accessToken: string): Promise<{
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}> {
  throw new Error('X OAuth not configured');
}

export async function fetchUserLists(_accessToken: string): Promise<{
  id: string;
  name: string;
  memberCount: number;
  description?: string;
}[]> {
  throw new Error('X OAuth not configured');
}

// Helper: Extract crypto assets from tweet text
function extractAssets(text: string): string[] {
  const assets: string[] = [];

  // Match $TICKER patterns
  const tickerMatches = text.match(/\$([A-Z]{2,10})\b/gi);
  if (tickerMatches) {
    for (const match of tickerMatches) {
      assets.push(match.slice(1).toUpperCase());
    }
  }

  // Match common asset names
  const commonAssets: Record<string, string> = {
    bitcoin: 'BTC',
    btc: 'BTC',
    ethereum: 'ETH',
    eth: 'ETH',
    solana: 'SOL',
    sol: 'SOL',
    avalanche: 'AVAX',
    polygon: 'MATIC',
    arbitrum: 'ARB',
    optimism: 'OP',
    chainlink: 'LINK',
    uniswap: 'UNI',
    aave: 'AAVE',
    dogecoin: 'DOGE',
    doge: 'DOGE',
    pepe: 'PEPE',
    bonk: 'BONK',
    shiba: 'SHIB',
  };

  const lowerText = text.toLowerCase();
  for (const [name, ticker] of Object.entries(commonAssets)) {
    if (lowerText.includes(name) && !assets.includes(ticker)) {
      assets.push(ticker);
    }
  }

  return [...new Set(assets)];
}

// Helper: Categorize based on mentioned assets
function categorizeFromAssets(
  assets: string[],
  text: string
): 'ai' | 'meme' | 'defi' | 'l1' | 'gaming' | 'infrastructure' | 'other' {
  const categories: Record<string, string[]> = {
    ai: ['RENDER', 'FET', 'TAO', 'RNDR', 'AGIX', 'OCEAN', 'VIRTUAL', 'AIXBT', 'AI16Z'],
    meme: ['DOGE', 'PEPE', 'BONK', 'SHIB', 'WIF', 'FLOKI', 'POPCAT', 'MOG', 'TRUMP', 'FARTCOIN'],
    defi: ['LINK', 'UNI', 'AAVE', 'MKR', 'CRV', 'GMX', 'DYDX', 'SNX', 'LDO', 'PENDLE'],
    l1: ['BTC', 'ETH', 'SOL', 'AVAX', 'SUI', 'APT', 'NEAR', 'ATOM', 'DOT', 'ADA'],
    gaming: ['AXS', 'SAND', 'MANA', 'GALA', 'IMX', 'APE', 'ENJ', 'PRIME'],
    infrastructure: ['ARB', 'OP', 'MATIC', 'STRK', 'ZK', 'MANTA'],
  };

  for (const [category, categoryAssets] of Object.entries(categories)) {
    if (assets.some(asset => categoryAssets.includes(asset))) {
      return category as any;
    }
  }

  const lowerText = text.toLowerCase();
  if (lowerText.includes('ai ') || lowerText.includes('artificial intelligence') || lowerText.includes('agent')) return 'ai';
  if (lowerText.includes('meme') || lowerText.includes('degen')) return 'meme';
  if (lowerText.includes('defi') || lowerText.includes('yield') || lowerText.includes('lending')) return 'defi';
  if (lowerText.includes('layer 1') || lowerText.includes('l1')) return 'l1';
  if (lowerText.includes('gaming') || lowerText.includes('metaverse') || lowerText.includes('nft')) return 'gaming';
  if (lowerText.includes('layer 2') || lowerText.includes('l2') || lowerText.includes('rollup')) return 'infrastructure';

  return 'other';
}
