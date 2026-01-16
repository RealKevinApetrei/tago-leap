'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignTypedData, useChainId, useSwitchChain } from 'wagmi';
import { pearApi } from '@/lib/api';

// Hyperliquid uses Arbitrum for signing
const ARBITRUM_CHAIN_ID = 42161;

interface UseAgentWalletReturn {
  agentWalletAddress: string | null;
  exists: boolean;
  isLoading: boolean;
  isCreating: boolean;
  isApproving: boolean;
  needsApproval: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  createAgentWallet: () => Promise<string | null>;
  approveAgentWallet: (agentAddress: string) => Promise<void>;
}

/**
 * Hook to manage Pear Protocol Agent Wallet
 *
 * Flow:
 * 1. Check if agent wallet exists via Pear API
 * 2. If not, create one via Pear API
 * 3. User must approve the agent wallet on Hyperliquid
 */
export function useAgentWallet(): UseAgentWalletReturn {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check agent wallet status
  const checkStatus = useCallback(async () => {
    if (!address) {
      setExists(false);
      setAgentWalletAddress(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const status = await pearApi.getAgentWallet(address);
      setExists(status.exists);
      setAgentWalletAddress(status.agentWalletAddress);
      setNeedsApproval(false); // If wallet exists, it's approved
    } catch (err) {
      console.error('[useAgentWallet] Failed to check status:', err);
      setExists(false);
      setAgentWalletAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Create agent wallet via Pear API
  const createAgentWallet = useCallback(async (): Promise<string | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await pearApi.createAgentWallet(address);
      setAgentWalletAddress(result.agentWalletAddress);
      // Agent wallet created - Pear handles the approval internally
      // Mark as exists so we can proceed
      setExists(true);
      setNeedsApproval(false);
      return result.agentWalletAddress;
    } catch (err: any) {
      console.error('[useAgentWallet] Failed to create:', err);
      setError(err?.message || 'Failed to create agent wallet');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [address]);

  // Approve agent wallet on Hyperliquid
  // This requires the user to sign an EIP-712 message for Hyperliquid
  const approveAgentWallet = useCallback(async (agentAddress: string) => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsApproving(true);
    setError(null);

    const originalChainId = currentChainId;

    try {
      // Switch to Arbitrum if needed (Hyperliquid uses Arbitrum for signing)
      if (currentChainId !== ARBITRUM_CHAIN_ID) {
        console.log('[useAgentWallet] Switching to Arbitrum for signing');
        await switchChainAsync({ chainId: ARBITRUM_CHAIN_ID });
      }

      // EIP-712 domain for Hyperliquid agent approval
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: ARBITRUM_CHAIN_ID,
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      };

      const types = {
        HyperliquidTransaction: [
          { name: 'source', type: 'string' },
          { name: 'connectionId', type: 'bytes32' },
        ],
        Agent: [
          { name: 'source', type: 'string' },
          { name: 'connectionId', type: 'bytes32' },
        ],
      };

      // Create the connection ID (hash of agent address + timestamp)
      const nonce = Date.now();
      const connectionId = `0x${'0'.repeat(64)}` as `0x${string}`; // Placeholder - Hyperliquid generates this

      const message = {
        source: 'a', // 'a' = approve agent
        connectionId,
      };

      // Sign the approval message
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'Agent',
        message,
      });

      // Send approval to Hyperliquid API
      // Note: This happens directly with Hyperliquid, not through our backend
      const response = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveAgent',
            hyperliquidChain: 'Mainnet',
            signatureChainId: `0x${ARBITRUM_CHAIN_ID.toString(16)}`,
            agentAddress,
            agentName: 'Pear Protocol',
            nonce,
          },
          nonce,
          signature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyperliquid approval failed: ${errorText}`);
      }

      // Refresh status to confirm approval
      await checkStatus();
      setNeedsApproval(false);

      // Switch back to original chain if needed
      if (originalChainId !== ARBITRUM_CHAIN_ID) {
        console.log('[useAgentWallet] Switching back to original chain');
        await switchChainAsync({ chainId: originalChainId });
      }
    } catch (err: any) {
      console.error('[useAgentWallet] Approval failed:', err);
      setError(err?.message || 'Failed to approve agent wallet');
    } finally {
      setIsApproving(false);
    }
  }, [address, signTypedDataAsync, switchChainAsync, currentChainId, checkStatus]);

  // Check status on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      checkStatus();
    } else {
      setExists(false);
      setAgentWalletAddress(null);
      setIsLoading(false);
    }
  }, [isConnected, address, checkStatus]);

  return {
    agentWalletAddress,
    exists,
    isLoading,
    isCreating,
    isApproving,
    needsApproval,
    error,
    checkStatus,
    createAgentWallet,
    approveAgentWallet,
  };
}
