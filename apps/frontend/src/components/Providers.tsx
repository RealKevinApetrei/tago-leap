'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, type State, cookieToInitialState } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

interface ProvidersProps {
  children: ReactNode;
  cookie?: string;
}

const customTheme = darkTheme({
  accentColor: '#FFD633',
  accentColorForeground: 'black',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Create a stable QueryClient instance
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we want to avoid refetching on mount
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children, cookie }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const queryClient = getQueryClient();

  // Parse cookie into wagmi initial state for SSR hydration
  const initialState = useMemo(() => {
    if (!cookie) return undefined;
    return cookieToInitialState(config, cookie);
  }, [cookie]);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState} reconnectOnMount={true}>
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
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
