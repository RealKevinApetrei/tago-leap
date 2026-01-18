'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { pearApi } from '@/lib/api';

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
      // First check if Pear has created an agent wallet
      const status = await pearApi.getAgentWallet(address);
      setAgentWalletAddress(status.agentWalletAddress);

      if (!status.exists || !status.agentWalletAddress) {
        setExists(false);
        setNeedsApproval(false);
        return;
      }

      // Now check if this agent wallet is actually approved on Hyperliquid
      const hlResponse = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'extraAgents',
          user: address,
        }),
      });

      if (hlResponse.ok) {
        const agents = await hlResponse.json();
        // Check if Pear's agent wallet is in the approved list
        const isApproved = Array.isArray(agents) && agents.some(
          (agent: { address: string }) =>
            agent.address.toLowerCase() === status.agentWalletAddress!.toLowerCase()
        );

        console.log('[useAgentWallet] Hyperliquid agents:', agents);
        console.log('[useAgentWallet] Pear agent approved:', isApproved);

        setExists(isApproved);
        setNeedsApproval(!isApproved);
      } else {
        // Can't verify, assume needs approval
        setExists(false);
        setNeedsApproval(true);
      }
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
      const err = 'Wallet not connected';
      setError(err);
      throw new Error(err);
    }

    // Wait for wallet client to be ready (up to 5 seconds)
    let client = walletClient;
    if (!client) {
      console.log('[useAgentWallet] Waiting for wallet client...');
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        // Re-check - wagmi should update the walletClient
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const { createWalletClient, custom } = await import('viem');
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts?.length) {
            const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
            client = createWalletClient({
              account: accounts[0] as `0x${string}`,
              chain: { id: parseInt(chainIdHex, 16) } as any,
              transport: custom(ethereum),
            });
            break;
          }
        }
      }
    }

    if (!client) {
      const err = 'Wallet not ready. Please try again.';
      setError(err);
      throw new Error(err);
    }

    // Use the wallet's actual connected chainId - Hyperliquid accepts signatures from any chain
    // The signatureChainId tells Hyperliquid which chain was used to sign
    const signatureChainIdHex = `0x${chainId.toString(16)}`;

    setIsApproving(true);
    setError(null);

    try {
      const nonce = Date.now();

      // EIP-712 domain for Hyperliquid - chainId must match wallet's connected chain
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      };

      // EIP-712 types for approveAgent action
      const types = {
        'HyperliquidTransaction:ApproveAgent': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'agentAddress', type: 'address' },
          { name: 'agentName', type: 'string' },
          { name: 'nonce', type: 'uint64' },
        ],
      };

      const message = {
        hyperliquidChain: 'Mainnet',
        agentAddress: agentAddress as `0x${string}`,
        agentName: 'Pear Protocol',
        nonce: BigInt(nonce),
      };

      console.log('[useAgentWallet] Signing agent approval:', {
        agentAddress,
        nonce,
        chainId,
        signatureChainIdHex,
      });

      // Sign the approval message using wallet client directly
      const signatureHex = await client.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        message,
      });

      // Convert hex signature to {r, s, v} format required by Hyperliquid
      const r = signatureHex.slice(0, 66); // 0x + 64 chars
      const s = `0x${signatureHex.slice(66, 130)}`;
      const v = parseInt(signatureHex.slice(130, 132), 16);

      const signature = { r, s, v };

      console.log('[useAgentWallet] Got signature, sending to Hyperliquid:', { r, s, v });

      // Hyperliquid expects signature with r, s, v components
      // The signature from signTypedData is already in the right format (0x + r + s + v)
      const requestBody = {
        action: {
          type: 'approveAgent',
          hyperliquidChain: 'Mainnet',
          signatureChainId: signatureChainIdHex,
          agentAddress: agentAddress,
          agentName: 'Pear Protocol',
          nonce: nonce,
        },
        nonce: nonce,
        signature,
      };

      console.log('[useAgentWallet] Request body:', JSON.stringify(requestBody, null, 2));

      // Send approval to Hyperliquid API
      const response = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('[useAgentWallet] Hyperliquid response:', responseText);

      if (!response.ok) {
        throw new Error(`Hyperliquid approval failed: ${responseText}`);
      }

      // Check for error in response body
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Response might not be JSON, that's okay
      }

      if (responseData?.status === 'err') {
        throw new Error(responseData.response || 'Approval failed');
      }

      // Mark as approved and refresh status
      setExists(true);
      setNeedsApproval(false);
      await checkStatus();

      console.log('[useAgentWallet] Agent wallet approved successfully');
    } catch (err: any) {
      console.error('[useAgentWallet] Approval failed:', err);
      const errorMessage = err?.message || 'Failed to approve agent wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsApproving(false);
    }
  }, [address, walletClient, chainId, checkStatus]);

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
