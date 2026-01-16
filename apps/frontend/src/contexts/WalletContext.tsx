'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        isDisconnected,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
