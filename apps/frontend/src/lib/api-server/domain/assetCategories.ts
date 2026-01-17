/**
 * Asset categorization for sector concentration analysis
 *
 * Categories help track concentration risk across different market sectors
 */

export type AssetCategory = 'L1' | 'L2' | 'AI' | 'Meme' | 'DeFi' | 'Gaming' | 'RWA' | 'Other';

/**
 * Mapping of asset symbols to their categories
 * Update this as new assets are added to Hyperliquid
 */
export const ASSET_CATEGORIES: Record<string, AssetCategory> = {
  // L1 - Layer 1 blockchains
  BTC: 'L1',
  ETH: 'L1',
  SOL: 'L1',
  AVAX: 'L1',
  SUI: 'L1',
  APT: 'L1',
  NEAR: 'L1',
  ATOM: 'L1',
  DOT: 'L1',
  ADA: 'L1',
  XRP: 'L1',
  TRX: 'L1',
  TON: 'L1',
  FTM: 'L1',
  SEI: 'L1',
  INJ: 'L1',
  TIA: 'L1',
  HBAR: 'L1',

  // L2 - Layer 2 scaling solutions
  ARB: 'L2',
  OP: 'L2',
  MATIC: 'L2',
  STRK: 'L2',
  ZK: 'L2',
  IMX: 'L2',
  MANTA: 'L2',
  METIS: 'L2',

  // AI - AI and compute tokens
  TAO: 'AI',
  FET: 'AI',
  RENDER: 'AI',
  RNDR: 'AI',
  VIRTUAL: 'AI',
  AIXBT: 'AI',
  AI16Z: 'AI',
  ZEREBRO: 'AI',
  GOAT: 'AI',
  GRIFFAIN: 'AI',
  ARC: 'AI',
  AGIX: 'AI',
  OCEAN: 'AI',
  AKRO: 'AI',

  // Meme - Meme coins
  DOGE: 'Meme',
  SHIB: 'Meme',
  PEPE: 'Meme',
  WIF: 'Meme',
  BONK: 'Meme',
  FLOKI: 'Meme',
  POPCAT: 'Meme',
  MOG: 'Meme',
  TRUMP: 'Meme',
  FARTCOIN: 'Meme',
  NEIRO: 'Meme',
  MOODENG: 'Meme',
  PNUT: 'Meme',
  SPX: 'Meme',

  // DeFi - Decentralized Finance
  LINK: 'DeFi',
  UNI: 'DeFi',
  AAVE: 'DeFi',
  MKR: 'DeFi',
  CRV: 'DeFi',
  GMX: 'DeFi',
  DYDX: 'DeFi',
  SNX: 'DeFi',
  LDO: 'DeFi',
  PENDLE: 'DeFi',
  COMP: 'DeFi',
  SUSHI: 'DeFi',
  YFI: 'DeFi',
  '1INCH': 'DeFi',
  JUP: 'DeFi',
  ONDO: 'DeFi',
  ENA: 'DeFi',
  EIGEN: 'DeFi',
  HYPE: 'DeFi',

  // Gaming - Gaming and metaverse
  AXS: 'Gaming',
  SAND: 'Gaming',
  MANA: 'Gaming',
  GALA: 'Gaming',
  IMX: 'Gaming',
  APE: 'Gaming',
  ENJ: 'Gaming',
  ILV: 'Gaming',
  PRIME: 'Gaming',
  PIXEL: 'Gaming',
  RON: 'Gaming',

  // RWA - Real World Assets
  ONDO: 'RWA',
  PYTH: 'RWA',
};

/**
 * Get the category for an asset symbol
 * Returns 'Other' for unknown assets
 */
export function getAssetCategory(symbol: string): AssetCategory {
  return ASSET_CATEGORIES[symbol.toUpperCase()] || 'Other';
}

/**
 * Calculate sector concentration from positions
 * Returns percentage of total notional in each sector
 */
export function calculateSectorConcentration(
  positions: Array<{ asset: string; notional: number }>
): Record<AssetCategory, number> {
  const sectorNotional: Record<AssetCategory, number> = {
    L1: 0,
    L2: 0,
    AI: 0,
    Meme: 0,
    DeFi: 0,
    Gaming: 0,
    RWA: 0,
    Other: 0,
  };

  let totalNotional = 0;

  for (const position of positions) {
    const category = getAssetCategory(position.asset);
    const absNotional = Math.abs(position.notional);
    sectorNotional[category] += absNotional;
    totalNotional += absNotional;
  }

  // Convert to percentages
  const concentration: Record<AssetCategory, number> = {
    L1: 0,
    L2: 0,
    AI: 0,
    Meme: 0,
    DeFi: 0,
    Gaming: 0,
    RWA: 0,
    Other: 0,
  };

  if (totalNotional > 0) {
    for (const category of Object.keys(sectorNotional) as AssetCategory[]) {
      concentration[category] = (sectorNotional[category] / totalNotional) * 100;
    }
  }

  return concentration;
}

/**
 * Find the most concentrated sector
 */
export function getLargestSectorConcentration(
  concentration: Record<AssetCategory, number>
): { sector: AssetCategory; percentage: number } {
  let maxSector: AssetCategory = 'Other';
  let maxPct = 0;

  for (const [sector, pct] of Object.entries(concentration)) {
    if (pct > maxPct) {
      maxPct = pct;
      maxSector = sector as AssetCategory;
    }
  }

  return { sector: maxSector, percentage: maxPct };
}
