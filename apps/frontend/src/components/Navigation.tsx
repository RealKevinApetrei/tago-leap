'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';

const navItems = [
  { label: 'Onboard', href: '/onboard', tab: null, icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )},
  { label: 'Narrative', href: '/robo?tab=trade', tab: 'trade', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  )},
  { label: 'Portfolio', href: '/robo?tab=portfolio', tab: 'portfolio', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  )},
  { label: 'Risk', href: '/robo?tab=risk', tab: 'risk', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )},
  { label: 'History', href: '/robo?tab=history', tab: 'history', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
];

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (item: typeof navItems[0]) => {
    if (item.href === '/onboard') {
      return pathname === '/onboard';
    }
    if (pathname === '/robo') {
      const activeTab = currentTab || 'trade';
      return item.tab === activeTab;
    }
    return false;
  };

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

          {/* Center Navigation */}
          <div className="flex items-center">
            {navItems.map((item) => {
              const active = isActive(item);
              const hovered = hoveredItem === item.label;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="relative px-4 py-2 group"
                >
                  <span className={`
                    relative z-10 flex items-center gap-2 text-sm font-light tracking-wide transition-colors duration-200
                    ${active ? 'text-white' : 'text-white/50 group-hover:text-white/80'}
                  `}>
                    <span className={`transition-colors duration-200 ${active ? 'text-yellow-400' : 'text-white/30 group-hover:text-white/50'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>

                  {/* Active indicator - subtle underline */}
                  <span className={`
                    absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-yellow-400 to-yellow-500
                    transition-all duration-300 ease-out
                    ${active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                  `} />

                  {/* Hover background */}
                  <span className={`
                    absolute inset-0 rounded-lg bg-white/[0.03]
                    transition-opacity duration-200
                    ${hovered && !active ? 'opacity-100' : 'opacity-0'}
                  `} />
                </Link>
              );
            })}
          </div>

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
