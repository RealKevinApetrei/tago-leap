'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface XAccount {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface XAccountConnectProps {
  account: XAccount | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error?: string | null;
}

export function XAccountConnect({
  account,
  isConnecting,
  onConnect,
  onDisconnect,
  error,
}: XAccountConnectProps) {
  const [showDisconnect, setShowDisconnect] = useState(false);

  if (account) {
    return (
      <div
        className="relative flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
        onMouseEnter={() => setShowDisconnect(true)}
        onMouseLeave={() => setShowDisconnect(false)}
      >
        <img
          src={account.avatar || `https://unavatar.io/twitter/${account.username}`}
          alt={account.displayName}
          className="w-8 h-8 rounded-full bg-white/10"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{account.displayName}</p>
          <p className="text-xs text-white/50">@{account.username}</p>
        </div>

        {/* Disconnect button on hover */}
        {showDisconnect && (
          <button
            onClick={onDisconnect}
            className="absolute inset-0 flex items-center justify-center bg-red-500/90 rounded-xl text-white text-sm font-medium transition-opacity"
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all
          ${isConnecting
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90'
          }
        `}
      >
        <XLogo className="w-5 h-5" />
        {isConnecting ? 'Connecting...' : 'Connect X Account'}
      </button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

/**
 * Compact version for header
 */
export function XAccountConnectCompact({
  account,
  isConnecting,
  onConnect,
  onDisconnect,
}: XAccountConnectProps) {
  if (account) {
    return (
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors group"
      >
        <img
          src={account.avatar || `https://unavatar.io/twitter/${account.username}`}
          alt={account.displayName}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-sm text-white/70 group-hover:text-white">@{account.username}</span>
        <XIcon className="w-4 h-4 text-white/40 group-hover:text-red-400" />
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={isConnecting}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors"
    >
      <XLogo className="w-4 h-4" />
      <span className="text-sm">{isConnecting ? 'Connecting...' : 'Connect X'}</span>
    </button>
  );
}

/**
 * Full-page connect prompt for when X is required
 */
export function XAccountConnectPrompt({
  isConnecting,
  onConnect,
  error,
}: {
  isConnecting: boolean;
  onConnect: () => void;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
        <XLogo className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">Connect your X account</h2>
      <p className="text-white/50 max-w-md mb-8">
        Connect your X account to access social trading features, see trending crypto tweets,
        and generate trades from the latest market sentiment.
      </p>

      <button
        onClick={onConnect}
        disabled={isConnecting}
        className={`
          flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold transition-all
          ${isConnecting
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90 hover:scale-105'
          }
        `}
      >
        <XLogo className="w-6 h-6" />
        {isConnecting ? 'Connecting...' : 'Connect with X'}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-8 text-xs text-white/30 max-w-sm">
        <p>We only request read-only access to your timeline.</p>
        <p className="mt-1">Your credentials are never stored on our servers.</p>
      </div>
    </div>
  );
}

// Icons
function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
