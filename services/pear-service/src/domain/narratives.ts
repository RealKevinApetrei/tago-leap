import type { Narrative } from '@tago-leap/shared/types';

/**
 * Hardcoded narrative templates for trading pairs.
 * These represent market "stories" or themes users can bet on.
 */
export const narratives: Narrative[] = [
  {
    id: 'ai-vs-eth',
    name: 'AI vs ETH',
    description: 'Bet on AI tokens outperforming or underperforming Ethereum',
    longAsset: 'FET',
    shortAsset: 'ETH',
  },
  {
    id: 'sol-eco-vs-btc',
    name: 'SOL Ecosystem vs BTC',
    description: 'Bet on Solana ecosystem tokens vs Bitcoin',
    longAsset: 'SOL',
    shortAsset: 'BTC',
  },
  {
    id: 'defi-vs-eth',
    name: 'DeFi vs ETH',
    description: 'Bet on DeFi blue chips outperforming Ethereum',
    longAsset: 'UNI',
    shortAsset: 'ETH',
  },
  {
    id: 'l2-vs-eth',
    name: 'L2s vs ETH',
    description: 'Bet on Layer 2 tokens vs Ethereum mainnet',
    longAsset: 'ARB',
    shortAsset: 'ETH',
  },
  {
    id: 'meme-momentum',
    name: 'Meme Momentum',
    description: 'Bet on meme coin momentum vs stable blue chips',
    longAsset: 'DOGE',
    shortAsset: 'BTC',
  },
];

/**
 * Get a narrative by ID.
 */
export function getNarrativeById(id: string): Narrative | undefined {
  return narratives.find((n) => n.id === id);
}

/**
 * Get all available narratives.
 */
export function getAllNarratives(): Narrative[] {
  return narratives;
}
