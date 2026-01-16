'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignTypedData, useSwitchChain, useChainId } from 'wagmi';
import { pearApi } from '@/lib/api';

interface UsePearAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  expiresAt: string | null;
  error: string | null;
  authenticate: () => Promise<void>;
  checkStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export function usePearAuth(): UsePearAuthReturn {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check auth status
  const checkStatus = useCallback(async () => {
    if (!address) {
      setIsAuthenticated(false);
      setExpiresAt(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const status = await pearApi.getAuthStatus(address);
      setIsAuthenticated(status.authenticated);
      setExpiresAt(status.expiresAt || null);
    } catch (err) {
      console.error('[usePearAuth] Failed to check status:', err);
      setIsAuthenticated(false);
      setExpiresAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Authenticate with Pear Protocol
  const authenticate = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    const originalChainId = currentChainId;

    try {
      // 1. Get EIP-712 message to sign (includes timestamp)
      const eip712Data = await pearApi.getAuthMessage(address);

      // 2. Switch to Arbitrum if needed (Pear uses chainId 42161 for EIP-712)
      const requiredChainId = eip712Data.domain.chainId;
      if (currentChainId !== requiredChainId) {
        console.log('[usePearAuth] Switching to chain', requiredChainId);
        await switchChainAsync({ chainId: requiredChainId });
      }

      // 3. Sign the message with wallet
      const signature = await signTypedDataAsync({
        domain: eip712Data.domain as any,
        types: eip712Data.types as any,
        primaryType: eip712Data.primaryType as any,
        message: eip712Data.message as any,
      });

      // 4. Submit signature with timestamp to verify
      await pearApi.verifyAuth({
        walletAddress: address,
        signature,
        timestamp: eip712Data.timestamp,
      });

      // 5. Update state
      await checkStatus();

      // 6. Switch back to original chain if needed
      if (originalChainId !== requiredChainId) {
        console.log('[usePearAuth] Switching back to chain', originalChainId);
        await switchChainAsync({ chainId: originalChainId });
      }
    } catch (err: any) {
      console.error('[usePearAuth] Authentication failed:', err);
      setError(err?.message || 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signTypedDataAsync, switchChainAsync, currentChainId, checkStatus]);

  // Logout
  const logout = useCallback(async () => {
    if (!address) return;

    try {
      await pearApi.logout(address);
      setIsAuthenticated(false);
      setExpiresAt(null);
    } catch (err) {
      console.error('[usePearAuth] Logout failed:', err);
    }
  }, [address]);

  // Check status on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      checkStatus();
    } else {
      setIsAuthenticated(false);
      setExpiresAt(null);
      setIsLoading(false);
    }
  }, [isConnected, address, checkStatus]);

  return {
    isAuthenticated,
    isLoading,
    isAuthenticating,
    expiresAt,
    error,
    authenticate,
    checkStatus,
    logout,
  };
}
