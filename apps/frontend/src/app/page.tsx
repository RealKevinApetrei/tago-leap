'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-between py-4">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          <div className="absolute inset-0 bg-gradient-radial from-tago-yellow-400/5 via-transparent to-transparent animate-pulse-slow" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo & Title */}
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {/* Logo Mark */}
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-tago-yellow-400/30 to-tago-yellow-500/10" />
              <div className="absolute inset-[2px] rounded-[10px] bg-tago-black flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-tago-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">
              <span className="italic text-tago-yellow-400">TAGO</span> Leap
            </h1>
          </div>
          <p className="text-white/50 text-base font-light">
            AI-powered narrative trading on Hyperliquid
          </p>
        </div>

        {/* Orbital Animation Container */}
        <div className={`relative w-56 h-56 mx-auto my-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {/* Center Core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-tago-yellow-400/20 to-tago-yellow-400/5 animate-pulse" />
            <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-tago-yellow-400/30 to-tago-yellow-400/10 backdrop-blur-sm" />
            <div className="absolute inset-3 rounded-full bg-tago-black flex items-center justify-center">
              <svg className="w-4 h-4 text-tago-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
          </div>

          {/* Orbital Rings */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
            {/* Outer ring */}
            <circle
              cx="112"
              cy="112"
              r="100"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="1"
              strokeDasharray="4 8"
              className="animate-spin-slow"
              style={{ transformOrigin: 'center' }}
            />
            {/* Middle ring */}
            <circle
              cx="112"
              cy="112"
              r="70"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="1"
              strokeDasharray="2 6"
              className="animate-spin-reverse"
              style={{ transformOrigin: 'center' }}
            />
            {/* Inner ring */}
            <circle
              cx="112"
              cy="112"
              r="42"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="1"
              className="animate-spin-slow"
              style={{ transformOrigin: 'center' }}
            />

            {/* Gradient Definition */}
            <defs>
              <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD633" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#FFD633" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#FFD633" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Orbiting Node 1 - Deposits (Top) */}
          <div
            className="absolute w-16 h-16"
            style={{
              top: '50%',
              left: '50%',
              marginTop: '-32px',
              marginLeft: '-32px',
              animation: 'orbit 20s linear infinite',
            }}
          >
            <div className="relative w-full h-full" style={{ transform: 'translateY(-70px)' }}>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 backdrop-blur-sm border border-emerald-500/20 p-2 hover:scale-110 transition-transform cursor-default">
                <div className="flex flex-col items-center justify-center h-full">
                  <svg className="w-4 h-4 text-emerald-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[9px] text-emerald-400/90 font-medium">Deposit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Orbiting Node 2 - Salt Risk (Bottom Left) */}
          <div
            className="absolute w-16 h-16"
            style={{
              top: '50%',
              left: '50%',
              marginTop: '-32px',
              marginLeft: '-32px',
              animation: 'orbit 20s linear infinite',
              animationDelay: '-6.67s',
            }}
          >
            <div className="relative w-full h-full" style={{ transform: 'translateY(-70px)' }}>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm border border-blue-500/20 p-2 hover:scale-110 transition-transform cursor-default">
                <div className="flex flex-col items-center justify-center h-full">
                  <svg className="w-4 h-4 text-blue-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span className="text-[9px] text-blue-400/90 font-medium">Salt</span>
                </div>
              </div>
            </div>
          </div>

          {/* Orbiting Node 3 - Pear Execution (Bottom Right) */}
          <div
            className="absolute w-16 h-16"
            style={{
              top: '50%',
              left: '50%',
              marginTop: '-32px',
              marginLeft: '-32px',
              animation: 'orbit 20s linear infinite',
              animationDelay: '-13.33s',
            }}
          >
            <div className="relative w-full h-full" style={{ transform: 'translateY(-70px)' }}>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 backdrop-blur-sm border border-purple-500/20 p-2 hover:scale-110 transition-transform cursor-default">
                <div className="flex flex-col items-center justify-center h-full">
                  <svg className="w-4 h-4 text-purple-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span className="text-[9px] text-purple-400/90 font-medium">Pear</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-tago-yellow-400/60"
                style={{
                  top: '50%',
                  left: '50%',
                  animation: `particle ${3 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Data Flow Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 224 224">
            <defs>
              <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD633" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFD633" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FFD633" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Animated flow paths */}
            <circle
              cx="112"
              cy="112"
              r="56"
              fill="none"
              stroke="url(#flow-gradient)"
              strokeWidth="2"
              strokeDasharray="15 140"
              className="animate-flow"
              style={{ transformOrigin: 'center' }}
            />
          </svg>
        </div>

        {/* Feature Pills */}
        <div className={`flex flex-wrap justify-center gap-2 mb-4 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-400 font-medium">Bridge from Any Chain</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <span className="text-[11px] text-blue-400 font-medium">Built-in Risk Controls</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            <span className="text-[11px] text-purple-400 font-medium">AI Trade Suggestions</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link href="/robo">
            <Button variant="yellow" size="lg" className="px-6 py-3 text-sm font-medium shadow-lg shadow-tago-yellow-500/20 hover:shadow-tago-yellow-500/40 transition-shadow">
              Start Placing Narrative Trades
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Section with Bounty Highlights */}
      <div className={`text-center space-y-3 transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Key Concepts - Abstracted Bounty Info */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-white/30">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-tago-yellow-400/60" />
            <span className="italic">Trade ideas</span>, not tokens
          </span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400/60" />
            One-click from <span className="italic">any chain</span>
          </span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-blue-400/60" />
            <span className="italic">Non-custodial</span> risk control
          </span>
        </div>

        {/* Attribution */}
        <p className="text-[10px] text-white/20">
          Powered by <span className="italic text-tago-yellow-400/40">TAGO Research</span>
        </p>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes particle {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(-25px) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(-25px) scale(1);
          }
          90% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(-80px) scale(1);
          }
          100% {
            transform: translate(-50%, -50%) translateY(-95px) scale(0);
            opacity: 0;
          }
        }

        @keyframes flow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-orbit {
          animation: orbit 20s linear infinite;
        }

        .animate-flow {
          animation: flow 4s linear infinite;
        }

        .animate-spin-slow {
          animation: spin 30s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin 25s linear infinite reverse;
        }

        .animate-pulse-slow {
          animation: pulse 4s ease-in-out infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
