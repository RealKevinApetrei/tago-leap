'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Connector, useConnect } from 'wagmi';
import { Button } from './ui/Button';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLET_ICONS: Record<string, string> = {
  metaMask: '/wallets/metamask.svg',
  walletConnect: '/wallets/walletconnect.svg',
  coinbaseWalletSDK: '/wallets/coinbase.svg',
  injected: '/wallets/injected.svg',
};

const WALLET_NAMES: Record<string, string> = {
  metaMask: 'MetaMask',
  walletConnect: 'WalletConnect',
  coinbaseWalletSDK: 'Coinbase Wallet',
  injected: 'Browser Wallet',
};

function getWalletIcon(connector: Connector): string {
  if (connector.icon) return connector.icon;
  return WALLET_ICONS[connector.id] || WALLET_ICONS.injected;
}

function getWalletName(connector: Connector): string {
  if (connector.name && connector.name !== 'Injected') {
    return connector.name;
  }
  return WALLET_NAMES[connector.id] || connector.name || 'Wallet';
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connect, connectors, isPending, error } = useConnect();

  // Deduplicate connectors by id, preferring connectors with icons
  const uniqueConnectors = useMemo(() => {
    const seen = new Map<string, Connector>();

    for (const connector of connectors) {
      const existingConnector = seen.get(connector.id);

      // Prefer connector with icon, or first one if neither has icon
      if (!existingConnector || (connector.icon && !existingConnector.icon)) {
        seen.set(connector.id, connector);
      }
    }

    // Filter out injected if MetaMask is available (MetaMask injects as both)
    const result = Array.from(seen.values());
    const hasMetaMask = result.some(c => c.id === 'metaMask' || c.name === 'MetaMask');

    return result.filter(c => {
      // If MetaMask is available, filter out generic injected
      if (hasMetaMask && c.id === 'injected' && c.name === 'Injected') {
        return false;
      }
      return true;
    });
  }, [connectors]);

  const handleConnect = useCallback(
    (connector: Connector) => {
      connect({ connector }, { onSuccess: () => onClose() });
    },
    [connect, onClose]
  );

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-tago-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
      >
        <h2 id="connect-wallet-title" className="text-xl font-medium text-white mb-2">
          Connect Wallet
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Choose your preferred wallet to connect
        </p>

        <div className="flex flex-col gap-2">
          {uniqueConnectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden group-hover:bg-white/15 transition-colors">
                {connector.icon ? (
                  <img
                    src={connector.icon}
                    alt={getWalletName(connector)}
                    className="w-6 h-6"
                  />
                ) : (
                  <WalletIcon connectorId={connector.id} />
                )}
              </div>
              <span className="font-medium">{getWalletName(connector)}</span>
              {isPending && (
                <span className="ml-auto">
                  <LoadingSpinner />
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">
            {error.message || 'Failed to connect. Please try again.'}
          </p>
        )}

        <div className="mt-4">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function WalletIcon({ connectorId }: { connectorId: string }) {
  switch (connectorId) {
    case 'metaMask':
      return <MetaMaskIcon />;
    case 'walletConnect':
      return <WalletConnectIcon />;
    case 'coinbaseWalletSDK':
      return <CoinbaseIcon />;
    default:
      return <DefaultWalletIcon />;
  }
}

function MetaMaskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21.5 4L13 10.5L14.5 6.5L21.5 4Z" fill="#E17726" stroke="#E17726" strokeWidth="0.5" />
      <path d="M2.5 4L10.9 10.6L9.5 6.5L2.5 4Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M18.5 16.5L16.5 19.5L21 20.5L22 16.5H18.5Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M2 16.5L3 20.5L7.5 19.5L5.5 16.5H2Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M7.3 11L6 13L10.5 13.2L10.3 8.5L7.3 11Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M16.7 11L13.6 8.4L13.5 13.2L18 13L16.7 11Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M7.5 19.5L10.2 18.2L7.8 16.5L7.5 19.5Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
      <path d="M13.8 18.2L16.5 19.5L16.2 16.5L13.8 18.2Z" fill="#E27625" stroke="#E27625" strokeWidth="0.5" />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 9C9.5 6 14.5 6 17.5 9L18 9.5C18.2 9.7 18.2 10 18 10.2L16.8 11.4C16.7 11.5 16.5 11.5 16.4 11.4L15.7 10.7C13.5 8.5 10.5 8.5 8.3 10.7L7.5 11.5C7.4 11.6 7.2 11.6 7.1 11.5L5.9 10.3C5.7 10.1 5.7 9.8 5.9 9.6L6.5 9ZM20 11.5L21 12.5C21.2 12.7 21.2 13 21 13.2L15.5 18.7C15.3 18.9 15 18.9 14.8 18.7L11 15C10.95 14.95 10.85 14.95 10.8 15L7 18.7C6.8 18.9 6.5 18.9 6.3 18.7L0.8 13.2C0.6 13 0.6 12.7 0.8 12.5L1.8 11.5C2 11.3 2.3 11.3 2.5 11.5L6.3 15.3C6.35 15.35 6.45 15.35 6.5 15.3L10.3 11.5C10.5 11.3 10.8 11.3 11 11.5L14.8 15.3C14.85 15.35 14.95 15.35 15 15.3L18.8 11.5C19 11.3 19.3 11.3 19.5 11.5L20 11.5Z"
        fill="#3B99FC"
      />
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0052FF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18ZM10.5 10.5H13.5V13.5H10.5V10.5Z"
        fill="white"
      />
    </svg>
  );
}

function DefaultWalletIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M16 14h.01" />
      <path d="M2 10h20" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/60" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
