'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Auto-refresh interval in milliseconds (15 seconds)
const AUTO_REFRESH_INTERVAL = 15_000;

// Position types
export interface PositionAsset {
  asset: string;
  weight: number;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

export interface Position {
  id: string;
  longAssets: PositionAsset[];
  shortAssets: PositionAsset[];
  leverage: number;
  usdValue: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed' | 'liquidated';
  createdAt: string;
  updatedAt: string;
}

// Hyperliquid asset position structure
interface HyperliquidAssetPosition {
  position: {
    coin: string;
    szi: string;        // Size (negative for short)
    entryPx: string;    // Entry price
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
    leverage: {
      type: string;
      value: number;
    };
    maxLeverage: number;
  };
}

interface UsePositionsReturn {
  positions: Position[];
  isLoading: boolean;
  isClosing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  // Computed values
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export function usePositions(): UsePositionsReturn {
  const { address, isConnected } = useAccount();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch positions directly from Hyperliquid
  const refresh = useCallback(async (silent = false) => {
    if (!address) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch clearinghouse state from Hyperliquid
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
        }),
      });

      if (!response.ok) {
        throw new Error(`Hyperliquid API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[usePositions] Hyperliquid response:', data);

      const assetPositions: HyperliquidAssetPosition[] = data.assetPositions || [];

      // Filter only positions with non-zero size
      const activePositions = assetPositions.filter(ap => {
        const size = parseFloat(ap.position.szi);
        return size !== 0;
      });

      console.log('[usePositions] Active positions:', activePositions.length);

      // Convert Hyperliquid positions to our format
      const normalizedPositions: Position[] = activePositions.map((ap, index) => {
        const pos = ap.position;
        const size = parseFloat(pos.szi);
        const entryPrice = parseFloat(pos.entryPx);
        const positionValue = parseFloat(pos.positionValue);
        const unrealizedPnl = parseFloat(pos.unrealizedPnl);
        const roe = parseFloat(pos.returnOnEquity) * 100; // Convert to percentage
        const leverage = pos.leverage?.value || 1;

        const isLong = size > 0;

        // Create the position asset
        const positionAsset: PositionAsset = {
          asset: pos.coin,
          weight: 1,
          size: Math.abs(size),
          entryPrice,
          currentPrice: positionValue / Math.abs(size), // Calculate current price
          pnl: unrealizedPnl,
        };

        return {
          id: `hl-${pos.coin}-${index}`,
          longAssets: isLong ? [positionAsset] : [],
          shortAssets: isLong ? [] : [positionAsset],
          leverage,
          usdValue: Math.abs(positionValue),
          pnl: unrealizedPnl,
          pnlPercent: roe,
          status: 'open' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setPositions(normalizedPositions);
    } catch (err: any) {
      console.error('[usePositions] Failed to fetch positions:', err);
      setError(err?.message || 'Failed to fetch positions');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Close a position via Pear API (places an opposite order)
  const closePosition = useCallback(async (positionId: string) => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsClosing(true);
    setError(null);

    try {
      // Extract asset from position ID (format: hl-COIN-index)
      const parts = positionId.split('-');
      const coin = parts[1];

      // Find the position
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        throw new Error('Position not found');
      }

      // Determine if it's a long or short position
      const isLong = position.longAssets.length > 0;
      const positionAssets = isLong ? position.longAssets : position.shortAssets;

      if (positionAssets.length === 0) {
        throw new Error('No assets in position');
      }

      // Get the asset info
      const asset = positionAssets[0].asset;
      const size = position.usdValue;
      const leverage = position.leverage;

      console.log('[usePositions] Closing position:', { asset, size, isLong, leverage });

      // Call our close-by-asset API
      const response = await fetch('/api/pear/positions/close-by-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          asset,
          size,
          isLong,
          leverage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to close position');
      }

      console.log('[usePositions] Position closed:', data);

      // Wait a moment for Hyperliquid to process, then refresh positions
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refresh();
    } catch (err: any) {
      console.error('[usePositions] Failed to close position:', err);
      setError(err?.message || 'Failed to close position');
    } finally {
      setIsClosing(false);
    }
  }, [address, positions, refresh]);

  // Load positions on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      refresh();
    } else {
      setPositions([]);
      setIsLoading(false);
    }
  }, [isConnected, address, refresh]);

  // Auto-refresh polling
  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    const intervalId = setInterval(() => {
      refresh(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected, address, refresh]);

  // Compute totals
  const totalValue = positions.reduce((sum, p) => sum + p.usdValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

  return {
    positions,
    isLoading,
    isClosing,
    error,
    refresh,
    closePosition,
    totalValue,
    totalPnl,
    totalPnlPercent,
  };
}
