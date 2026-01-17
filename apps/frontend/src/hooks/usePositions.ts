'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { pearApi } from '@/lib/api';

// Position types matching PearPosition from shared types
export interface PositionAsset {
  asset: string;
  weight: number;
  size: number;
  entryPrice: number;
  currentPrice: number;
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

  // Fetch positions
  const refresh = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await pearApi.getPositions(address);
      // Filter only open positions
      const openPositions = (data || []).filter((p: Position) => p.status === 'open');
      setPositions(openPositions);
    } catch (err: any) {
      console.error('[usePositions] Failed to fetch positions:', err);
      setError(err?.message || 'Failed to fetch positions');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Close a position
  const closePosition = useCallback(async (positionId: string) => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsClosing(true);
    setError(null);

    try {
      await pearApi.closePosition(positionId, address);
      // Refresh positions after closing
      await refresh();
    } catch (err: any) {
      console.error('[usePositions] Failed to close position:', err);
      setError(err?.message || 'Failed to close position');
    } finally {
      setIsClosing(false);
    }
  }, [address, refresh]);

  // Load positions on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      refresh();
    } else {
      setPositions([]);
      setIsLoading(false);
    }
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
