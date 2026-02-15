import type { CryptoTweet } from '@/components/social/TweetCard';

// Crypto Twitter influencer accounts with real profile pictures
const AUTHORS = [
  { username: 'CryptoKaleo', displayName: 'Kaleo', avatar: 'https://unavatar.io/twitter/CryptoKaleo' },
  { username: 'DefiIgnas', displayName: 'Ignas | DeFi', avatar: 'https://unavatar.io/twitter/DefiIgnas' },
  { username: 'inversebrah', displayName: 'inversebrah', avatar: 'https://unavatar.io/twitter/inversebrah' },
  { username: 'tier10k', displayName: 'Tier10K', avatar: 'https://unavatar.io/twitter/tier10k' },
  { username: 'Route2FI', displayName: 'Route 2 FI', avatar: 'https://unavatar.io/twitter/Route2FI' },
  { username: 'CryptoCred', displayName: 'Cred', avatar: 'https://unavatar.io/twitter/CryptoCred' },
  { username: 'coaborozdogan', displayName: 'Cobie', avatar: 'https://unavatar.io/twitter/coaborozdogan' },
  { username: 'SmartContracter', displayName: 'Smart Contracter', avatar: 'https://unavatar.io/twitter/SmartContracter' },
  { username: 'LightCrypto', displayName: 'Light', avatar: 'https://unavatar.io/twitter/LightCrypto' },
  { username: 'CoinMamba', displayName: 'Coin Mamba', avatar: 'https://unavatar.io/twitter/CoinMamba' },
  { username: 'AltcoinGordon', displayName: 'Gordon', avatar: 'https://unavatar.io/twitter/AltcoinGordon' },
  { username: 'Pentosh1', displayName: 'Pentoshi', avatar: 'https://unavatar.io/twitter/Pentosh1' },
  { username: 'aixbt_agent', displayName: 'aixbt', avatar: 'https://unavatar.io/twitter/aixbt_agent' },
  { username: 'MustStopMurad', displayName: 'Murad', avatar: 'https://unavatar.io/twitter/MustStopMurad' },
  { username: 'blaborz', displayName: 'Blknoiz06', avatar: 'https://unavatar.io/twitter/Blknoiz06' },
  { username: 'hsaborozdogan', displayName: 'hsaka', avatar: 'https://unavatar.io/twitter/HsakaTrades' },
  { username: 'CryptoHayes', displayName: 'Arthur Hayes', avatar: 'https://unavatar.io/twitter/CryptoHayes' },
  { username: 'GiganticRebirth', displayName: 'GCR', avatar: 'https://unavatar.io/twitter/GiganticRebirth' },
  { username: 'loomdart', displayName: 'loomdart', avatar: 'https://unavatar.io/twitter/loomdart' },
  { username: 'RaoulGMI', displayName: 'Raoul Pal', avatar: 'https://unavatar.io/twitter/RaoulGMI' },
];

// Generate random metrics
const randomMetrics = () => ({
  likes: Math.floor(Math.random() * 50000) + 100,
  retweets: Math.floor(Math.random() * 10000) + 50,
  replies: Math.floor(Math.random() * 2000) + 10,
});

// Generate random date within last 24 hours
const randomRecentDate = () => {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  now.setHours(now.getHours() - hoursAgo);
  now.setMinutes(now.getMinutes() - minutesAgo);
  return now.toISOString();
};

// Get random author
const randomAuthor = () => AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

// Tweet content templates by category
const AI_TWEETS = [
  { content: '$VIRTUAL is about to have its ChatGPT moment. The AI agent meta is just getting started. 🤖', assets: ['VIRTUAL'], sentiment: 'bullish' as const },
  { content: 'Been watching $TAO closely. Bittensor\'s subnet architecture is genuinely innovative. This is what decentralized AI should look like.', assets: ['TAO'], sentiment: 'bullish' as const },
  { content: '$RENDER demand is going parabolic. Every AI company needs GPU compute. Simple as.', assets: ['RENDER'], sentiment: 'bullish' as const },
  { content: 'The $AI16Z DAO experiment is fascinating. Autonomous AI managing a treasury. We\'re speedrunning the future.', assets: ['AI16Z'], sentiment: 'bullish' as const },
  { content: '$FET and $AGIX merger creating the largest decentralized AI network. This is bigger than people realize.', assets: ['FET', 'AGIX'], sentiment: 'bullish' as const },
  { content: 'AI agents will manage more capital than human traders within 5 years. $AIXBT leading the charge.', assets: ['AIXBT'], sentiment: 'bullish' as const },
  { content: 'Why I\'m massively long $VIRTUAL:\n\n1. AI agent platform\n2. Revenue sharing model\n3. First mover advantage\n4. Community strength\n\nTarget: $10', assets: ['VIRTUAL'], sentiment: 'bullish' as const },
  { content: '$RNDR breaking out of accumulation. AI + DePIN is the narrative for 2025.', assets: ['RNDR'], sentiment: 'bullish' as const },
  { content: 'Just deployed my first AI agent on $VIRTUAL. The UX is actually incredible. This is the future of crypto x AI.', assets: ['VIRTUAL'], sentiment: 'bullish' as const },
  { content: 'The $TAO ecosystem is expanding rapidly. 32 subnets now live. Decentralized machine learning is here.', assets: ['TAO'], sentiment: 'bullish' as const },
  { content: '$OCEAN data marketplace volume hitting ATHs. Data is the new oil and OCEAN is the pipeline.', assets: ['OCEAN'], sentiment: 'bullish' as const },
  { content: 'Hot take: $NEAR\'s AI focus will make it a top 10 chain this cycle. Their AI assistant is genuinely useful.', assets: ['NEAR'], sentiment: 'bullish' as const },
  { content: 'AI agent coins are this cycle\'s DeFi summer. $VIRTUAL $AIXBT $AI16Z - pick your horse.', assets: ['VIRTUAL', 'AIXBT', 'AI16Z'], sentiment: 'bullish' as const },
  { content: '$ARKM intelligence platform seeing massive institutional interest. On-chain AI analytics is huge.', assets: ['ARKM'], sentiment: 'bullish' as const },
  { content: 'Sold my $FET too early. AI narrative is just heating up. Looking to re-enter on any dip.', assets: ['FET'], sentiment: 'bullish' as const },
];

const MEME_TWEETS = [
  { content: '$PEPE to $1 is not a meme. Okay it literally is a meme but you get what I mean. 🐸', assets: ['PEPE'], sentiment: 'bullish' as const },
  { content: '$DOGE Elon just tweeted a dog. You know what to do.', assets: ['DOGE'], sentiment: 'bullish' as const },
  { content: '$WIF dog wif hat is the purest expression of crypto culture. And it\'s pumping.', assets: ['WIF'], sentiment: 'bullish' as const },
  { content: '$BONK Solana\'s dog is hungry. New ATH incoming? 🦴', assets: ['BONK'], sentiment: 'bullish' as const },
  { content: 'Why does $SHIB have a $15B market cap but my serious project has $50M? I don\'t make the rules.', assets: ['SHIB'], sentiment: 'neutral' as const },
  { content: '$FLOKI Vikings don\'t ask for permission. They take. New partnership announced.', assets: ['FLOKI'], sentiment: 'bullish' as const },
  { content: 'Confession: I\'m mass long $PEPE. This frog has survived 3 bear markets in one cycle.', assets: ['PEPE'], sentiment: 'bullish' as const },
  { content: '$POPCAT pumping because... it\'s a cat that pops? I love crypto.', assets: ['POPCAT'], sentiment: 'bullish' as const },
  { content: '$MOG the face of crypto is sending it. Community is unmatched.', assets: ['MOG'], sentiment: 'bullish' as const },
  { content: 'Just aped $BRETT. Base memes are the play right now.', assets: ['BRETT'], sentiment: 'bullish' as const },
  { content: '$TRUMP memecoin doing numbers. Politics meets crypto, what could go wrong?', assets: ['TRUMP'], sentiment: 'bullish' as const },
  { content: 'Memecoins are unironically the best performing sector this month. $PEPE $WIF $BONK all green.', assets: ['PEPE', 'WIF', 'BONK'], sentiment: 'bullish' as const },
  { content: '$FARTCOIN exists and has a $500M market cap. We\'re all gonna make it.', assets: ['FARTCOIN'], sentiment: 'neutral' as const },
  { content: 'The $DOGE community is the strongest in crypto. That\'s not alpha, that\'s just facts.', assets: ['DOGE'], sentiment: 'bullish' as const },
  { content: 'New meta: AI x Memes. $GOAT leading the pack. Artificial intelligence meets artificial value.', assets: ['GOAT'], sentiment: 'bullish' as const },
  { content: '$WIF just got listed on another CEX. The hat stays on. 🎩', assets: ['WIF'], sentiment: 'bullish' as const },
  { content: 'Reminder that $PEPE went from 0 to $5B market cap in months. Memes are money.', assets: ['PEPE'], sentiment: 'bullish' as const },
  { content: 'My portfolio: 50% $BTC, 50% $PEPE. Perfectly balanced as all things should be.', assets: ['BTC', 'PEPE'], sentiment: 'bullish' as const },
];

const DEFI_TWEETS = [
  { content: '$AAVE just hit $1B in revenue. DeFi blue chips are ridiculously undervalued.', assets: ['AAVE'], sentiment: 'bullish' as const },
  { content: 'Pendle $PENDLE yield trading is the most innovative DeFi primitive since AMMs. Fixed yield is huge for institutions.', assets: ['PENDLE'], sentiment: 'bullish' as const },
  { content: '$GMX real yield narrative coming back. 30% of fees to stakers. This is how DeFi should work.', assets: ['GMX'], sentiment: 'bullish' as const },
  { content: '$UNI v4 hooks are going to unlock so much innovation. Uniswap remains the king of DEXes.', assets: ['UNI'], sentiment: 'bullish' as const },
  { content: 'Why is nobody talking about $CRV? Curve wars heating up again. veCRV model is genius.', assets: ['CRV'], sentiment: 'bullish' as const },
  { content: '$LDO liquid staking is eating the ETH staking market. 30% market share and growing.', assets: ['LDO'], sentiment: 'bullish' as const },
  { content: '$MKR burning supply faster than anyone expected. DAI demand through the roof.', assets: ['MKR'], sentiment: 'bullish' as const },
  { content: 'Restaking on $EIGEN is the new meta. Points meta 2.0 is here.', assets: ['EIGEN'], sentiment: 'bullish' as const },
  { content: '$DYDX v4 on Cosmos is a game changer. Fully decentralized perps with $1B+ daily volume.', assets: ['DYDX'], sentiment: 'bullish' as const },
  { content: 'Just bridged to @arbitrum for the $GMX ecosystem. L2 DeFi is thriving.', assets: ['GMX', 'ARB'], sentiment: 'bullish' as const },
  { content: '$SNX Synthetix V3 launch incoming. Perps on Optimism are going to be massive.', assets: ['SNX'], sentiment: 'bullish' as const },
  { content: 'DeFi TVL quietly climbing back to $100B. $AAVE $MKR $UNI leading the recovery.', assets: ['AAVE', 'MKR', 'UNI'], sentiment: 'bullish' as const },
  { content: '$PENDLE integrating with every major protocol. Yield tokenization is the future.', assets: ['PENDLE'], sentiment: 'bullish' as const },
  { content: 'The $LINK oracle network processes $75B+ in value. Most undervalued infra play in crypto.', assets: ['LINK'], sentiment: 'bullish' as const },
  { content: 'Ethena $ENA yield is insane right now. 25% APY on stables. What\'s the catch?', assets: ['ENA'], sentiment: 'neutral' as const },
];

const L1_TWEETS = [
  { content: '$BTC to $200K this cycle is not a meme. Institutional flows are just starting.', assets: ['BTC'], sentiment: 'bullish' as const },
  { content: '$ETH ETF approval was just the beginning. Wall Street is coming for your bags.', assets: ['ETH'], sentiment: 'bullish' as const },
  { content: '$SOL processed 50M transactions yesterday. No other chain comes close to this TPS.', assets: ['SOL'], sentiment: 'bullish' as const },
  { content: 'The $SUI Move ecosystem is exploding. DeepBook, Turbos, NAVI all shipping.', assets: ['SUI'], sentiment: 'bullish' as const },
  { content: '$APT Aptos TPS hitting new highs. Move chains are the future of L1s.', assets: ['APT'], sentiment: 'bullish' as const },
  { content: '$AVAX subnet adoption accelerating. Gaming chains launching weekly.', assets: ['AVAX'], sentiment: 'bullish' as const },
  { content: 'Unpopular opinion: $ETH is still undervalued relative to $BTC. The ratio will flip.', assets: ['ETH', 'BTC'], sentiment: 'bullish' as const },
  { content: '$SOL Firedancer upgrade will 10x throughput. Solana is just getting started.', assets: ['SOL'], sentiment: 'bullish' as const },
  { content: 'Every $BTC dip is a buying opportunity at this point. Supply shock is real.', assets: ['BTC'], sentiment: 'bullish' as const },
  { content: '$NEAR AI + blockchain integration is underrated. Sharding + AI = scalability.', assets: ['NEAR'], sentiment: 'bullish' as const },
  { content: 'The $DOT Polkadot 2.0 upgrade is massive. Coretime market changes everything.', assets: ['DOT'], sentiment: 'bullish' as const },
  { content: '$ATOM IBC connections hitting ATH. Cosmos ecosystem is thriving quietly.', assets: ['ATOM'], sentiment: 'bullish' as const },
  { content: 'My L1 rankings for this cycle:\n1. $ETH\n2. $SOL\n3. $SUI\n4. $APT\n5. $AVAX', assets: ['ETH', 'SOL', 'SUI', 'APT', 'AVAX'], sentiment: 'bullish' as const },
  { content: '$SOL breaking $200 this month. NFT + DeFi + memes all firing on Solana.', assets: ['SOL'], sentiment: 'bullish' as const },
  { content: 'BlackRock holding $20B in $BTC. When did crypto become tradfi? I\'m here for it.', assets: ['BTC'], sentiment: 'bullish' as const },
];

const INFRASTRUCTURE_TWEETS = [
  { content: '$ARB Arbitrum doing 10x Ethereum\'s TPS. L2 summer is here.', assets: ['ARB'], sentiment: 'bullish' as const },
  { content: '$OP Superchain thesis playing out. Base, Zora, Mode all OP Stack.', assets: ['OP'], sentiment: 'bullish' as const },
  { content: '$STRK Starknet proving ZK at scale. 1M TPS is not a meme with STARK proofs.', assets: ['STRK'], sentiment: 'bullish' as const },
  { content: 'The $MATIC → $POL migration is underrated. Polygon 2.0 aggregated blockchain narrative is huge.', assets: ['MATIC', 'POL'], sentiment: 'bullish' as const },
  { content: '$TIA Celestia modular DA is the future. Every chain will use Celestia.', assets: ['TIA'], sentiment: 'bullish' as const },
  { content: 'ZK rollups are coming online. $ZK $STRK $MANTA all shipping.', assets: ['ZK', 'STRK', 'MANTA'], sentiment: 'bullish' as const },
  { content: '$ARB Stylus bringing Rust and C++ to Arbitrum. Dev adoption about to explode.', assets: ['ARB'], sentiment: 'bullish' as const },
  { content: 'Base chain TVL up 500% this quarter. Coinbase distribution is unmatched.', assets: [], sentiment: 'bullish' as const },
  { content: '$METIS decentralized sequencer is live. First L2 to achieve true decentralization.', assets: ['METIS'], sentiment: 'bullish' as const },
  { content: 'The L2 wars are heating up. $ARB $OP $STRK battling for dominance.', assets: ['ARB', 'OP', 'STRK'], sentiment: 'neutral' as const },
  { content: '$LINK CCIP adoption accelerating. Cross-chain messaging is critical infrastructure.', assets: ['LINK'], sentiment: 'bullish' as const },
  { content: 'Modular blockchain thesis:\n- Execution: L2s\n- Settlement: $ETH\n- DA: $TIA\n- Consensus: Various\n\nThe future is modular.', assets: ['ETH', 'TIA'], sentiment: 'bullish' as const },
];

const GAMING_TWEETS = [
  { content: '$IMX Immutable zkEVM launching AAA games. Web3 gaming finally getting good.', assets: ['IMX'], sentiment: 'bullish' as const },
  { content: '$PRIME Parallel TCG doing insane volume. Finally a Web3 game people actually play.', assets: ['PRIME'], sentiment: 'bullish' as const },
  { content: 'The $GALA ecosystem expansion is massive. Music, film, games - all on one platform.', assets: ['GALA'], sentiment: 'bullish' as const },
  { content: '$BEAM gaming chain from Merit Circle. Gaming-specific L2 is the play.', assets: ['BEAM'], sentiment: 'bullish' as const },
  { content: '$AXS Axie Infinity comeback arc? New game modes bringing players back.', assets: ['AXS'], sentiment: 'neutral' as const },
  { content: 'Web3 gaming learned from 2021 mistakes. Better games, sustainable economics.', assets: [], sentiment: 'bullish' as const },
  { content: '$SAND Sandbox partnerships with major brands. Virtual real estate play.', assets: ['SAND'], sentiment: 'bullish' as const },
  { content: '$RON Ronin chain is the home of Web3 gaming. Pixels doing millions DAU.', assets: ['RON'], sentiment: 'bullish' as const },
  { content: 'Gaming tokens bottomed. $IMX $GALA $BEAM all showing strength.', assets: ['IMX', 'GALA', 'BEAM'], sentiment: 'bullish' as const },
  { content: '$PIXEL Pixels on Ronin is the most played Web3 game ever. F2P + crypto works.', assets: ['PIXEL'], sentiment: 'bullish' as const },
];

// Combine all tweets into one array
const ALL_TWEET_TEMPLATES = [
  ...AI_TWEETS.map(t => ({ ...t, category: 'ai' as const })),
  ...MEME_TWEETS.map(t => ({ ...t, category: 'meme' as const })),
  ...DEFI_TWEETS.map(t => ({ ...t, category: 'defi' as const })),
  ...L1_TWEETS.map(t => ({ ...t, category: 'l1' as const })),
  ...INFRASTRUCTURE_TWEETS.map(t => ({ ...t, category: 'infrastructure' as const })),
  ...GAMING_TWEETS.map(t => ({ ...t, category: 'gaming' as const })),
];

// Generate 100 mock tweets
export const MOCK_TWEETS: CryptoTweet[] = Array.from({ length: 100 }, (_, index) => {
  const template = ALL_TWEET_TEMPLATES[index % ALL_TWEET_TEMPLATES.length];
  const author = randomAuthor();

  return {
    id: `mock_tweet_${index + 1}`,
    url: `https://x.com/${author.username}/status/mock_tweet_${index + 1}`,
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    authorAvatar: author.avatar,
    content: template.content,
    createdAt: randomRecentDate(),
    metrics: randomMetrics(),
    mentionedAssets: template.assets,
    category: template.category,
    sentiment: template.sentiment,
  };
});

// Export by category for convenience
export const MOCK_TWEETS_BY_CATEGORY = {
  ai: MOCK_TWEETS.filter(t => t.category === 'ai'),
  meme: MOCK_TWEETS.filter(t => t.category === 'meme'),
  defi: MOCK_TWEETS.filter(t => t.category === 'defi'),
  l1: MOCK_TWEETS.filter(t => t.category === 'l1'),
  infrastructure: MOCK_TWEETS.filter(t => t.category === 'infrastructure'),
  gaming: MOCK_TWEETS.filter(t => t.category === 'gaming'),
};

// Get shuffled tweets (for variety)
export const getShuffledTweets = (): CryptoTweet[] => {
  return [...MOCK_TWEETS].sort(() => Math.random() - 0.5);
};

// Get tweets by category
export const getTweetsByCategory = (category: CryptoTweet['category']): CryptoTweet[] => {
  return MOCK_TWEETS.filter(t => t.category === category);
};

// Get trending tweets (sorted by engagement)
export const getTrendingTweets = (limit = 20): CryptoTweet[] => {
  return [...MOCK_TWEETS]
    .sort((a, b) => {
      const engagementA = a.metrics.likes + a.metrics.retweets * 2;
      const engagementB = b.metrics.likes + b.metrics.retweets * 2;
      return engagementB - engagementA;
    })
    .slice(0, limit);
};
