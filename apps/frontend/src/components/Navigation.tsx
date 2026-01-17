'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navItems = [
  { label: 'Onboard', href: '/onboard', tab: null },
  { label: 'Narrative', href: '/robo?tab=trade', tab: 'trade' },
  { label: 'Portfolio', href: '/robo?tab=portfolio', tab: 'portfolio' },
  { label: 'Risk', href: '/robo?tab=risk', tab: 'risk' },
  { label: 'History', href: '/robo?tab=history', tab: 'history' },
];

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const isActive = (item: typeof navItems[0]) => {
    if (item.href === '/onboard') {
      return pathname === '/onboard';
    }
    // For robo tabs, check both pathname and tab query param
    if (pathname === '/robo') {
      // Default to 'trade' tab if no tab specified
      const activeTab = currentTab || 'trade';
      return item.tab === activeTab;
    }
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo Image */}
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-tago-yellow-500/20 group-hover:shadow-tago-yellow-500/40 group-hover:scale-105 transition-all duration-300">
              <Image
                src="/logo.png"
                alt="TAGO"
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* Text */}
            <div className="flex items-baseline gap-1">
              <span className="text-base font-light italic text-tago-yellow-400 tracking-tight">TAGO</span>
              <span className="text-base font-light text-white/90 tracking-tight">Leap</span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-xl p-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-3 py-2 rounded-lg text-sm tracking-wide transition-all duration-300
                    ${
                      active
                        ? 'bg-gradient-to-r from-tago-yellow-400 to-tago-yellow-500 text-black font-medium shadow-lg shadow-tago-yellow-500/20'
                        : 'text-white/60 hover:text-white hover:bg-white/5 font-light'
                    }
                  `}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-0 rounded-lg bg-tago-yellow-400/20 blur-xl -z-10" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Wallet Button */}
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
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-tago-yellow-400 to-tago-yellow-500 text-black font-medium text-sm hover:shadow-lg hover:shadow-tago-yellow-500/25 transition-all"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-all"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                        >
                          {chain.hasIcon && (
                            <div
                              className="w-5 h-5 rounded-full overflow-hidden"
                              style={{ background: chain.iconBackground }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  className="w-5 h-5"
                                />
                              )}
                            </div>
                          )}
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/90 font-mono"
                        >
                          {account.displayName}
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
