'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Onboard', href: '/onboard' },
  { label: 'Trade', href: '/narratives' },
  { label: 'Robo', href: '/robo' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-tago-yellow-500/20 group-hover:shadow-tago-yellow-500/30 transition-shadow">
              <Image
                src="/logo.png"
                alt="TAGO Leap"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-light text-white tracking-wide">
                <span className="italic text-tago-yellow-400">TAGO</span> Leap
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm tracking-wide transition-all duration-300
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-tago-yellow-400 to-tago-yellow-500 text-black font-medium shadow-lg shadow-tago-yellow-500/20'
                        : 'text-white/60 hover:text-white hover:bg-white/5 font-light'
                    }
                  `}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-0 rounded-lg bg-tago-yellow-400/20 blur-xl -z-10" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
