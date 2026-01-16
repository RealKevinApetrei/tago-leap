import { lifiConfig } from '../config/lifiConfig.js';
import type { SupportedOption, LifiRoute } from '@tago-leap/shared/types';

/**
 * Get supported chains and tokens.
 * This is a stub implementation returning placeholder data.
 */
export async function getSupportedOptions(): Promise<SupportedOption[]> {
  console.log(`[LifiClient] Getting supported options from ${lifiConfig.apiBaseUrl}`);

  // Stub response - return placeholder chains/tokens
  return [
    {
      chainId: 1,
      chainName: 'Ethereum',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      ],
    },
    {
      chainId: 42161,
      chainName: 'Arbitrum',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 10,
      chainName: 'Optimism',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 999,
      chainName: 'HyperEVM',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xHYPER_USDC_PLACEHOLDER', symbol: 'USDC', decimals: 6 },
      ],
    },
  ];
}

interface GetRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
}

/**
 * Get routes for a cross-chain swap.
 * This is a stub implementation returning a fake route.
 */
export async function getRoutes(params: GetRoutesParams): Promise<LifiRoute> {
  console.log(`[LifiClient] Getting routes:`, params);

  // Stub response - return a fake route
  return {
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromToken: params.fromTokenAddress,
    toToken: params.toTokenAddress,
    fromAmount: params.fromAmount,
    toAmount: params.fromAmount, // 1:1 for stub
    estimatedGas: '0.005',
    steps: [
      {
        type: 'bridge',
        tool: 'hyperliquid-bridge',
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromToken: params.fromTokenAddress,
        toToken: params.toTokenAddress,
      },
    ],
  };
}
