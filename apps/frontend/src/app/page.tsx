'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-light mb-4 tracking-tight">
          <span className="italic text-tago-yellow-400">TAGO</span> Leap
        </h1>
        <p className="text-white/60 text-lg font-light max-w-md mx-auto leading-relaxed">
          Trade narratives. Onboard to Hyperliquid. Automate with{' '}
          <span className="italic text-tago-yellow-400">robo-managers</span>.
        </p>
      </div>

      {/* Action Cards */}
      <div className="space-y-4">
        <Card hoverable>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-white">
                <span className="italic text-tago-yellow-400">Onboard</span>
              </h2>
              <div className="w-10 h-10 rounded-xl bg-tago-yellow-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-tago-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white/60 font-light mb-6 leading-relaxed">
              Bridge assets from any chain to Hyperliquid and start trading.
            </p>
            <Link href="/onboard">
              <Button variant="yellow" fullWidth>
                Deposit to Hyperliquid
              </Button>
            </Link>
          </div>
        </Card>

        <Card hoverable>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-white">
                <span className="italic text-tago-yellow-400">Trade</span>
              </h2>
              <div className="w-10 h-10 rounded-xl bg-tago-yellow-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-tago-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white/60 font-light mb-6 leading-relaxed">
              Place narrative bets on market themes like AI vs ETH or SOL ecosystem.
            </p>
            <Link href="/narratives">
              <Button variant="yellow" fullWidth>
                Place Narrative Bet
              </Button>
            </Link>
          </div>
        </Card>

        <Card hoverable>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-white">
                <span className="italic text-tago-yellow-400">Robo</span>
              </h2>
              <div className="w-10 h-10 rounded-xl bg-tago-yellow-400/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-tago-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white/60 font-light mb-6 leading-relaxed">
              Configure automated trading strategies with Salt robo-managers.
            </p>
            <Link href="/robo">
              <Button variant="yellow" fullWidth>
                Enable Robo Manager
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="text-center py-4">
        <p className="text-xs text-white/30 font-light">
          Powered by <span className="italic text-tago-yellow-400/60">TAGO Research</span>
        </p>
      </div>
    </div>
  );
}
