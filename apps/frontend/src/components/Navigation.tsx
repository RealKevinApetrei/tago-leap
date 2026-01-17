'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDepositModal } from '@/components/DepositModal';

export function Navigation() {
  const { openDeposit } = useDepositModal();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/[0.05]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/[0.08] group-hover:ring-yellow-400/30 transition-all duration-300">
              <Image
                src="/logo.png"
                alt="TAGO"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-light tracking-tight">
                <span className="italic text-yellow-400">TAGO</span>
                <span className="text-white/90 ml-1">Leap</span>
              </span>
            </div>
          </Link>

          {/* Wallet */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="
                            px-5 py-2.5 rounded-xl
                            bg-gradient-to-r from-yellow-400 to-yellow-500
                            hover:from-yellow-300 hover:to-yellow-400
                            text-black text-sm font-medium tracking-wide
                            shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30
                            transition-all duration-200
                            active:scale-95
                          "
                        >
                          Connect
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="
                            px-4 py-2.5 rounded-xl
                            bg-red-500/10 border border-red-500/30
                            text-red-400 text-sm font-light
                            hover:bg-red-500/20 hover:border-red-500/50
                            transition-all duration-200
                          "
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-1">
                        {/* Deposit button */}
                        <button
                          onClick={openDeposit}
                          className="
                            flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-gradient-to-r from-yellow-400 to-yellow-500
                            hover:from-yellow-300 hover:to-yellow-400
                            text-black text-sm font-medium
                            shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30
                            transition-all duration-200
                            active:scale-95
                          "
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span>Deposit</span>
                        </button>

                        {/* Chain selector */}
                        <button
                          onClick={openChainModal}
                          className="
                            flex items-center justify-center
                            w-10 h-10 rounded-xl
                            bg-white/[0.03] border border-white/[0.05]
                            hover:bg-white/[0.06] hover:border-white/[0.10]
                            transition-all duration-200
                          "
                        >
                          {chain.hasIcon && chain.iconUrl ? (
                            <div
                              className="w-5 h-5 rounded-full overflow-hidden"
                              style={{ background: chain.iconBackground }}
                            >
                              <img
                                alt={chain.name ?? 'Chain'}
                                src={chain.iconUrl}
                                className="w-5 h-5"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/10" />
                          )}
                        </button>

                        {/* Account */}
                        <button
                          onClick={openAccountModal}
                          className="
                            flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                            bg-white/[0.03] border border-white/[0.05]
                            hover:bg-white/[0.06] hover:border-white/[0.10]
                            transition-all duration-200 group
                          "
                        >
                          {/* Avatar/Identicon placeholder */}
                          <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                          <span className="text-sm font-light text-white/70 group-hover:text-white/90 font-mono tracking-tight">
                            {account.displayName}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}
