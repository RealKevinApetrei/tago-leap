'use client';

import { useEffect, useState } from 'react';
import { MatrixRain, ASCIITweetColumns } from '@/components/ascii';
import { InlineSetupBar } from '@/components/InlineSetupBar';
import { AnimatePresence, motion } from 'framer-motion';

const FEATURES = [
  {
    tag: 'PEAR',
    title: 'Narrative Trading',
    description: 'Trade ideas and themes, not just tokens.',
  },
  {
    tag: 'LIFI',
    title: 'One-Click Onboarding',
    description: 'Bridge from any chain into your account.',
  },
  {
    tag: 'SALT',
    title: 'Robo Management',
    description: 'Policy-controlled automation.',
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSetupBar, setShowSetupBar] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-black">
      {/* Matrix Rain Background (ASCII Stars) */}
      <div className="absolute inset-0">
        <MatrixRain opacity={0.06} speed={0.8} density={0.04} color="yellow" />
      </div>

      {/* ASCII Tweet Columns on sides */}
      <ASCIITweetColumns />

      {/* MAIN CONTENT - Centered vertically */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4">
        {/* Yellow TAGO Leap Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`text-center transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Logo Mark */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-tago-yellow-400/30 to-tago-yellow-500/10" />
              <div className="absolute inset-[2px] rounded-[10px] bg-black flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-tago-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>
            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="italic text-tago-yellow-400">TAGO</span>{' '}
              <span className="text-white">Leap</span>
            </h1>
          </div>
          <p className="text-white/60 text-base font-normal max-w-md mx-auto">
            AI-powered narrative trading on Hyperliquid
          </p>
        </motion.div>

        {/* Feature Boxes - Compact horizontal layout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 w-full max-w-2xl"
        >
          <div className="grid grid-cols-3 gap-2">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.tag}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-medium text-tago-yellow-400/70 bg-tago-yellow-400/10 px-1.5 py-0.5 rounded">
                    {feature.tag}
                  </span>
                  <span className="text-xs font-medium text-white">{feature.title}</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Setup Bar or CTA Button */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {showSetupBar ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-sm"
              >
                <InlineSetupBar onCancel={() => setShowSetupBar(false)} />
              </motion.div>
            ) : (
              <motion.button
                key="cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSetupBar(true)}
                className="px-10 py-3 bg-tago-yellow-400 text-black text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-tago-yellow-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-tago-yellow-400/20"
              >
                Enter App
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Team Signatures - Bottom Right */}
      <div className="fixed bottom-4 right-6 z-10 flex flex-col items-end gap-1 text-[10px] text-white/30">
        <a
          href="https://x.com/KevinApetrei"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60 transition-colors"
        >
          Kevin <span className="text-white/20">@KevinApetrei</span>
        </a>
        <a
          href="https://x.com/Moya_2025"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60 transition-colors"
        >
          Zian <span className="text-white/20">@Moya_2025</span>
        </a>
        <a
          href="https://x.com/Loki31908422024"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60 transition-colors"
        >
          Loki <span className="text-white/20">@Loki31908422024</span>
        </a>
      </div>
    </div>
  );
}
