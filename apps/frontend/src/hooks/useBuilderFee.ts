'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';

// Pear Protocol builder address
const PEAR_BUILDER_ADDRESS = '0xA47D4d99191db54A4829cdf3de2417E527c3b042';

// Max fee rate in string format (0.1% = 10 bps = max allowed for perps)
const MAX_FEE_RATE = '0.1%';

// Supported chains for Hyperliquid signing (Arbitrum mainnet and testnet)
const SUPPORTED_CHAIN_IDS = [42161, 421614]; // Arbitrum One, Arbitrum Sepolia

interface UseBuilderFeeReturn {
  isApproved: boolean;
  isLoading: boolean;
  isApproving: boolean;
  needsChainSwitch: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  approveBuilderFee: () => Promise<void>;
}

/**
 * Hook to manage Pear Protocol Builder Fee approval on Hyperliquid
 *
 * Users must approve the builder fee before Pear can execute trades.
 * This is a one-time approval per builder address.
 */
export function useBuilderFee(): UseBuilderFeeReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if builder fee is already approved
  const checkStatus = useCallback(async () => {
    if (!address) {
      setIsApproved(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query Hyperliquid for max builder fee
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'maxBuilderFee',
          user: address,
          builder: PEAR_BUILDER_ADDRESS,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Response is just a number (fee in tenths of basis points)
        // e.g., 10 = 1 basis point = 0.01%
        const feeRate = typeof data === 'number' ? data : parseFloat(data || '0');
        const approved = feeRate > 0;
        setIsApproved(approved);
        console.log('[useBuilderFee] Current approval status:', { feeRate, approved, rawData: data });
      } else {
        const errorText = await response.text();
        console.log('[useBuilderFee] Query failed:', response.status, errorText);
        // If query fails, assume not approved
        setIsApproved(false);
      }
    } catch (err) {
      console.error('[useBuilderFee] Failed to check status:', err);
      // Don't block on this - assume not approved and let user try
      setIsApproved(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Approve builder fee on Hyperliquid
  const approveBuilderFee = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    if (!walletClient) {
      setError('Wallet client not ready');
      return;
    }

    // Use Arbitrum mainnet (42161) as default, fallback to connected chain if it's supported
    const signingChainId = SUPPORTED_CHAIN_IDS.includes(chainId) ? chainId : 42161;
    const signatureChainIdHex = `0x${signingChainId.toString(16)}`;

    setIsApproving(true);
    setError(null);

    try {
      const nonce = Date.now();

      // EIP-712 domain for Hyperliquid - chainId must match signatureChainId
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: signingChainId,
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      };

      // EIP-712 types for approveBuilderFee action
      const types = {
        'HyperliquidTransaction:ApproveBuilderFee': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'maxFeeRate', type: 'string' },
          { name: 'builder', type: 'address' },
          { name: 'nonce', type: 'uint64' },
        ],
      };

      const message = {
        hyperliquidChain: 'Mainnet',
        maxFeeRate: MAX_FEE_RATE,
        builder: PEAR_BUILDER_ADDRESS as `0x${string}`,
        nonce: BigInt(nonce),
      };

      console.log('[useBuilderFee] Signing builder fee approval:', {
        builder: PEAR_BUILDER_ADDRESS,
        maxFeeRate: MAX_FEE_RATE,
        nonce,
        chainId: signingChainId,
        signatureChainIdHex,
      });

      // Sign the approval message using wallet client directly
      const signatureHex = await walletClient.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
        message,
      });

      // Convert hex signature to {r, s, v} format required by Hyperliquid
      const r = signatureHex.slice(0, 66); // 0x + 64 chars
      const s = `0x${signatureHex.slice(66, 130)}`;
      const v = parseInt(signatureHex.slice(130, 132), 16);

      const signature = { r, s, v };

      console.log('[useBuilderFee] Got signature, sending to Hyperliquid:', { r, s, v });

      // Send approval to Hyperliquid API
      const response = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveBuilderFee',
            hyperliquidChain: 'Mainnet',
            signatureChainId: signatureChainIdHex,
            maxFeeRate: MAX_FEE_RATE,
            builder: PEAR_BUILDER_ADDRESS,
            nonce,
          },
          nonce,
          signature,
        }),
      });

      const responseText = await response.text();
      console.log('[useBuilderFee] Hyperliquid response:', responseText);

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

      setIsApproved(true);
      console.log('[useBuilderFee] Builder fee approved successfully');
    } catch (err: any) {
      console.error('[useBuilderFee] Approval failed:', err);
      setError(err?.message || 'Failed to approve builder fee');
    } finally {
      setIsApproving(false);
    }
  }, [address, walletClient, chainId]);

  // Check status on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      checkStatus();
    } else {
      setIsApproved(false);
      setIsLoading(false);
    }
  }, [isConnected, address, checkStatus]);

  // Check if user needs to switch to Arbitrum
  const needsChainSwitch = !SUPPORTED_CHAIN_IDS.includes(chainId);

  return {
    isApproved,
    isLoading,
    isApproving,
    needsChainSwitch,
    error,
    checkStatus,
    approveBuilderFee,
  };
}
