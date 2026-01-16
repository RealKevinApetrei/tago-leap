'use client';

import { ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: '#FFD633',
  accentColorForeground: 'black',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            ...customTheme,
            colors: {
              ...customTheme.colors,
              modalBackground: '#0a0a0a',
              modalBorder: 'rgba(255, 255, 255, 0.1)',
              profileForeground: '#0a0a0a',
              closeButton: 'rgba(255, 255, 255, 0.6)',
              closeButtonBackground: 'rgba(255, 255, 255, 0.1)',
              generalBorder: 'rgba(255, 255, 255, 0.1)',
              menuItemBackground: 'rgba(255, 255, 255, 0.05)',
            },
          }}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
