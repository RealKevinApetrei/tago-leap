import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import {
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  bsc,
  avalanche,
  gnosis,
  fantom,
  zkSync,
  linea,
  scroll,
  mantle,
  blast,
} from 'wagmi/chains';

/**
 * HyperEVM chain definition
 * Chain ID: 999
 * Native token: HYPE
 */
export const hyperevm = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    name: 'HYPE',
    symbol: 'HYPE',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid.xyz/evm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperEVM Explorer',
      url: 'https://explorer.hyperliquid.xyz',
    },
  },
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Get one at https://cloud.walletconnect.com');
}

export const config = getDefaultConfig({
  appName: 'TAGO Leap',
  projectId,
  chains: [
    hyperevm, // Primary chain
    arbitrum,
    mainnet,
    base,
    optimism,
    polygon,
    bsc,
    avalanche,
    gnosis,
    fantom,
    zkSync,
    linea,
    scroll,
    mantle,
    blast,
  ],
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
