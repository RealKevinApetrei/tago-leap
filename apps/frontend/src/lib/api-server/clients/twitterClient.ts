import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { serverEnv } from '../env';

/**
 * Validate X OAuth configuration
 * Returns error message if invalid, null if valid
 */
export function validateXConfig(): string | null {
  if (!serverEnv.X_CLIENT_ID) {
    return 'X_CLIENT_ID is not configured. Please set it in your environment variables.';
  }
  if (!serverEnv.X_CLIENT_SECRET) {
    return 'X_CLIENT_SECRET is not configured. Please set it in your environment variables.';
  }
  if (!serverEnv.X_CALLBACK_URL) {
    return 'X_CALLBACK_URL is not configured. Please set it in your environment variables.';
  }
  // Validate callback URL format
  try {
    const url = new URL(serverEnv.X_CALLBACK_URL);
    if (!url.pathname.includes('/api/twitter/auth/callback')) {
      return `X_CALLBACK_URL should end with /api/twitter/auth/callback. Got: ${serverEnv.X_CALLBACK_URL}`;
    }
  } catch {
    return `X_CALLBACK_URL is not a valid URL: ${serverEnv.X_CALLBACK_URL}`;
  }
  return null;
}

// Initialize Twitter client with bearer token for app-only auth
const getAppClient = () => {
  if (!serverEnv.X_BEARER_TOKEN) {
    throw new Error('X_BEARER_TOKEN is not configured');
  }
  return new TwitterApi(serverEnv.X_BEARER_TOKEN);
};

// Initialize Twitter client with user OAuth tokens
export const getUserClient = (accessToken: string) => {
  return new TwitterApi(accessToken);
};

// Curated list of crypto Twitter accounts to fetch from
const CRYPTO_ACCOUNTS = [
  'tier10k',
  'DefiIgnas',
  'CryptoKaleo',
  'inversebrah',
  'coaborozdogan',
  'pentaborish',
  'CryptoCred',
  'SmartContracter',
  'Route2FI',
  'LightCrypto',
  'CoinMamba',
  'SBF_FTX', // For historical context
  'ethereum',
  'solaborana',
  'AltcoinGordon',
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

/**
 * Fetch recent tweets from curated crypto accounts
 */
export async function fetchCryptoTweets(options?: {
  maxResults?: number;
  listId?: string;
  userAccessToken?: string;
}): Promise<CryptoTweet[]> {
  const { maxResults = 50, listId, userAccessToken } = options || {};

  try {
    const client = userAccessToken ? getUserClient(userAccessToken) : getAppClient();
    const readOnlyClient = client.readOnly;

    let tweets: TweetV2[] = [];
    const userMap = new Map<string, UserV2>();

    if (listId) {
      // Fetch from a specific list
      const listTweets = await readOnlyClient.v2.listTweets(listId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'attachments', 'entities'],
        'user.fields': ['username', 'name', 'profile_image_url'],
        expansions: ['author_id', 'attachments.media_keys'],
        'media.fields': ['url', 'type', 'preview_image_url'],
      });

      tweets = listTweets.data?.data || [];

      // Build user map from includes
      if (listTweets.data?.includes?.users) {
        for (const user of listTweets.data.includes.users) {
          userMap.set(user.id, user);
        }
      }
    } else {
      // Search for recent crypto tweets
      const searchQuery = '(crypto OR bitcoin OR ethereum OR solana OR defi OR NFT) -is:retweet lang:en';

      const searchResult = await readOnlyClient.v2.search(searchQuery, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'attachments', 'entities'],
        'user.fields': ['username', 'name', 'profile_image_url'],
        expansions: ['author_id', 'attachments.media_keys'],
        'media.fields': ['url', 'type', 'preview_image_url'],
        sort_order: 'relevancy',
      });

      tweets = searchResult.data?.data || [];

      // Build user map from includes
      if (searchResult.data?.includes?.users) {
        for (const user of searchResult.data.includes.users) {
          userMap.set(user.id, user);
        }
      }
    }

    // Transform tweets to our format
    const cryptoTweets: CryptoTweet[] = tweets.map((tweet) => {
      const author = userMap.get(tweet.author_id || '');
      const mentionedAssets = extractAssets(tweet.text);
      const category = categorizeFromAssets(mentionedAssets, tweet.text);

      return {
        id: tweet.id,
        authorUsername: author?.username || 'unknown',
        authorDisplayName: author?.name || 'Unknown',
        authorAvatar: author?.profile_image_url || '',
        content: tweet.text,
        createdAt: tweet.created_at || new Date().toISOString(),
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
        },
        mentionedAssets,
        category,
        sentiment: undefined, // Will be set by AI categorization
      };
    });

    // Sort by engagement (likes + retweets)
    cryptoTweets.sort((a, b) => {
      const engagementA = a.metrics.likes + a.metrics.retweets * 2;
      const engagementB = b.metrics.likes + b.metrics.retweets * 2;
      return engagementB - engagementA;
    });

    return cryptoTweets;
  } catch (error) {
    console.error('[twitterClient] Error fetching tweets:', error);
    throw error;
  }
}

/**
 * Fetch user's Twitter lists
 */
export async function fetchUserLists(accessToken: string): Promise<{
  id: string;
  name: string;
  memberCount: number;
  description?: string;
}[]> {
  try {
    const client = getUserClient(accessToken);
    const me = await client.v2.me();
    const lists = await client.v2.listsOwned(me.data.id, {
      'list.fields': ['member_count', 'description'],
    });

    return (lists.data?.data || []).map((list) => ({
      id: list.id,
      name: list.name,
      memberCount: list.member_count || 0,
      description: list.description,
    }));
  } catch (error) {
    console.error('[twitterClient] Error fetching user lists:', error);
    throw error;
  }
}

/**
 * Get OAuth 2.0 authorization URL
 */
export function getAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: serverEnv.X_CLIENT_ID,
    redirect_uri: serverEnv.X_CALLBACK_URL,
    scope: 'tweet.read users.read list.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const client = new TwitterApi({
    clientId: serverEnv.X_CLIENT_ID,
    clientSecret: serverEnv.X_CLIENT_SECRET,
  });

  const result = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: serverEnv.X_CALLBACK_URL,
  });

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const client = new TwitterApi({
    clientId: serverEnv.X_CLIENT_ID,
    clientSecret: serverEnv.X_CLIENT_SECRET,
  });

  const result = await client.refreshOAuth2Token(refreshToken);

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
}

/**
 * Get user info from access token
 */
export async function getUserInfo(accessToken: string): Promise<{
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}> {
  const client = getUserClient(accessToken);
  const me = await client.v2.me({
    'user.fields': ['profile_image_url', 'name'],
  });

  return {
    id: me.data.id,
    username: me.data.username,
    displayName: me.data.name,
    avatar: me.data.profile_image_url || '',
  };
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

  return [...new Set(assets)]; // Remove duplicates
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

  // Check assets against categories
  for (const [category, categoryAssets] of Object.entries(categories)) {
    if (assets.some((asset) => categoryAssets.includes(asset))) {
      return category as any;
    }
  }

  // Check text content for category hints
  const lowerText = text.toLowerCase();
  if (lowerText.includes('ai ') || lowerText.includes('artificial intelligence')) return 'ai';
  if (lowerText.includes('meme') || lowerText.includes('degen')) return 'meme';
  if (lowerText.includes('defi') || lowerText.includes('yield') || lowerText.includes('lending')) return 'defi';
  if (lowerText.includes('layer 1') || lowerText.includes('l1')) return 'l1';
  if (lowerText.includes('gaming') || lowerText.includes('metaverse') || lowerText.includes('nft')) return 'gaming';
  if (lowerText.includes('layer 2') || lowerText.includes('l2') || lowerText.includes('rollup')) return 'infrastructure';

  return 'other';
}
