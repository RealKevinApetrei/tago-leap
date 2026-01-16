import { getDefaultConfig } from '@rainbow-me/rainbowkit';
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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Get one at https://cloud.walletconnect.com');
}

export const config = getDefaultConfig({
  appName: 'TAGO Leap',
  projectId,
  chains: [
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
  ],
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
