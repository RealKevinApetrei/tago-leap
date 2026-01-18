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

      {/* Footer - Minimal */}
      <footer className="relative z-10 py-3 flex items-center justify-between px-6">
        <p className="text-[10px] text-white/20 font-mono">
          Powered by TAGO Research
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://twitter.com/tagoresearch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://github.com/tagoresearch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
