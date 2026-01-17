'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { pearApi } from '@/lib/api';

// Supported chains for Hyperliquid signing (Arbitrum mainnet and testnet)
const SUPPORTED_CHAIN_IDS = [42161, 421614]; // Arbitrum One, Arbitrum Sepolia

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
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

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
      // Agent wallet created on Pear side, but user must approve on Hyperliquid
      setExists(false); // Not ready until Hyperliquid approval
      setNeedsApproval(true);
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

    if (!walletClient) {
      setError('Wallet client not ready');
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const nonce = Date.now();

      // EIP-712 domain for Hyperliquid - omit chainId to avoid wallet validation issues
      // The signatureChainId in the action payload tells Hyperliquid how to verify
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      } as const;

      // EIP-712 types for approveAgent action
      const types = {
        'HyperliquidTransaction:ApproveAgent': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'agentAddress', type: 'address' },
          { name: 'agentName', type: 'string' },
          { name: 'nonce', type: 'uint64' },
        ],
      } as const;

      const message = {
        hyperliquidChain: 'Mainnet',
        agentAddress: agentAddress as `0x${string}`,
        agentName: 'Pear Protocol',
        nonce: BigInt(nonce),
      };

      console.log('[useAgentWallet] Signing agent approval:', { agentAddress, nonce });

      // Sign the approval message using wallet client directly
      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        message,
      });

      console.log('[useAgentWallet] Got signature, sending to Hyperliquid');

      // Send approval to Hyperliquid API
      const response = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveAgent',
            hyperliquidChain: 'Mainnet',
            signatureChainId: '0x66eee',
            agentAddress,
            agentName: 'Pear Protocol',
            nonce,
          },
          nonce,
          signature,
        }),
      });

      const responseText = await response.text();
      console.log('[useAgentWallet] Hyperliquid response:', responseText);

      if (!response.ok) {
        throw new Error(`Hyperliquid approval failed: ${responseText}`);
      }

      // Check for error in response body
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.status === 'err') {
          throw new Error(responseData.response || 'Approval failed');
        }
      } catch {
        // Response might not be JSON, that's okay
      }

      // Mark as approved and refresh status
      setExists(true);
      setNeedsApproval(false);
      await checkStatus();

      console.log('[useAgentWallet] Agent wallet approved successfully');
    } catch (err: any) {
      console.error('[useAgentWallet] Approval failed:', err);
      setError(err?.message || 'Failed to approve agent wallet');
    } finally {
      setIsApproving(false);
    }
  }, [address, walletClient, checkStatus]);

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
