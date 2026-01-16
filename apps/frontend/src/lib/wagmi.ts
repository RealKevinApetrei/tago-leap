import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { mainnet, arbitrum, base, optimism } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [mainnet, arbitrum, base, optimism],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'TAGO Leap',
        description: 'Trade narratives, onboard to Hyperliquid, and run robo-managers',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [],
      },
    }),
    coinbaseWallet({
      appName: 'TAGO Leap',
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
