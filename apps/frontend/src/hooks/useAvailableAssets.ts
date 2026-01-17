'use client';

import { useState, useEffect, useCallback } from 'react';
import { pearApi } from '@/lib/api';

// Asset categories for grouping
const ASSET_CATEGORIES: Record<string, string[]> = {
  'Major': ['BTC', 'ETH', 'SOL'],
  'Layer 1': ['AVAX', 'DOT', 'ATOM', 'NEAR', 'APT', 'SUI', 'SEI', 'INJ', 'TIA', 'TON', 'ADA', 'XRP', 'HBAR', 'ALGO', 'FTM', 'EGLD', 'CELO', 'ONE', 'ROSE', 'FLOW', 'KAVA', 'ZIL'],
  'Layer 2': ['ARB', 'OP', 'MATIC', 'IMX', 'STRK', 'MANTA', 'BLAST', 'BASE', 'ZK', 'METIS', 'BOBA'],
  'DeFi': ['LINK', 'UNI', 'AAVE', 'MKR', 'CRV', 'LDO', 'SNX', 'COMP', 'SUSHI', 'GMX', 'DYDX', 'JUP', 'PENDLE', 'YFI', '1INCH', 'BAL', 'CVX', 'FXS', 'RUNE', 'OSMO', 'VELO', 'CAKE', 'RAY', 'ORCA'],
  'AI': ['RENDER', 'FET', 'TAO', 'RNDR', 'AGIX', 'OCEAN', 'AKT', 'WLD', 'ARKM', 'PRIME', 'ALI', 'NMR', 'CTXC'],
  'Gaming': ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'PIXEL', 'SUPER', 'MAGIC', 'ILV', 'GODS', 'YGG', 'PYR', 'ALICE', 'BIGTIME'],
  'Meme': ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'MEME', 'DOGS', 'NEIRO', 'TURBO', 'BRETT', 'MYRO', 'POPCAT', 'MEW', 'MICHI', 'GOAT'],
  'Infrastructure': ['FIL', 'AR', 'GRT', 'ONDO', 'PYTH', 'W', 'ZRO', 'STX', 'ICP', 'TRX', 'VET', 'THETA', 'XLM', 'EOS', 'QNT', 'HNT', 'STORJ', 'SC', 'LPT'],
};

// Fallback list of known Hyperliquid assets (if API fails)
const FALLBACK_ASSETS = [
  'BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP',
  'WIF', 'PEPE', 'SUI', 'APT', 'INJ', 'TIA', 'SEI', 'JUP',
  'RENDER', 'TAO', 'FET', 'DOT', 'ATOM', 'NEAR', 'FTM', 'MATIC',
  'LTC', 'BCH', 'XRP', 'ADA', 'HBAR', 'UNI', 'AAVE', 'MKR',
  'SHIB', 'BONK', 'FLOKI', 'MEME', 'AXS', 'SAND', 'MANA',
  'FIL', 'AR', 'GRT', 'ONDO', 'PYTH', 'W', 'ZRO',
];

export interface AvailableAssetsResult {
  assets: string[];
  categories: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch available trading assets from Pear/Hyperliquid.
 * Assets are categorized and cached in localStorage.
 */
export function useAvailableAssets(): AvailableAssetsResult {
  const [assets, setAssets] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>(ASSET_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categorizeAssets = useCallback((assetList: string[]) => {
    // Create categories from available assets
    const categorized: Record<string, string[]> = {};
    const uncategorized: string[] = [];
    const categorizedAssets = new Set<string>();

    // First, add assets to their predefined categories
    for (const [category, categoryAssets] of Object.entries(ASSET_CATEGORIES)) {
      const available = categoryAssets.filter(a => assetList.includes(a));
      if (available.length > 0) {
        categorized[category] = available;
        available.forEach(a => categorizedAssets.add(a));
      }
    }

    // Find uncategorized assets
    for (const asset of assetList) {
      if (!categorizedAssets.has(asset)) {
        uncategorized.push(asset);
      }
    }

    // Add uncategorized as "Other" if any exist
    if (uncategorized.length > 0) {
      categorized['Other'] = uncategorized.sort();
    }

    return categorized;
  }, []);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check localStorage cache first (valid for 1 hour)
      const cached = localStorage.getItem('availableAssets');
      if (cached) {
        const { assets: cachedAssets, timestamp } = JSON.parse(cached);
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - timestamp < oneHour && Array.isArray(cachedAssets) && cachedAssets.length > 0) {
          setAssets(cachedAssets);
          setCategories(categorizeAssets(cachedAssets));
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await pearApi.getMarkets({ pageSize: 500 });

      // Extract unique assets from markets
      const uniqueAssets = new Set<string>();
      for (const market of response.markets) {
        for (const asset of market.longAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
        for (const asset of market.shortAssets || []) {
          if (asset.asset) uniqueAssets.add(asset.asset);
        }
      }

      const assetList = Array.from(uniqueAssets).sort();

      if (assetList.length === 0) {
        // Use fallback if API returns empty
        setAssets(FALLBACK_ASSETS);
        setCategories(categorizeAssets(FALLBACK_ASSETS));
      } else {
        setAssets(assetList);
        setCategories(categorizeAssets(assetList));

        // Cache in localStorage
        localStorage.setItem('availableAssets', JSON.stringify({
          assets: assetList,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch available assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');

      // Use fallback on error
      setAssets(FALLBACK_ASSETS);
      setCategories(categorizeAssets(FALLBACK_ASSETS));
    } finally {
      setIsLoading(false);
    }
  }, [categorizeAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    categories,
    isLoading,
    error,
    refresh: fetchAssets,
  };
}
