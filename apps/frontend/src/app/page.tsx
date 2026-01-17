'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ASCIISignalFlow, MatrixRain, ASCIITweetColumns } from '@/components/ascii';
import { FadeIn } from '@/components/motion';
import { InlineSetupBar } from '@/components/InlineSetupBar';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSetupBar, setShowSetupBar] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain
        opacity={0.04}
        density={0.5}
        speed={1.2}
        color="yellow"
        className="z-0"
      />

      {/* Subtle Gradient Overlay */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]">
          <div className="absolute inset-0 bg-gradient-radial from-tago-yellow-400/4 via-transparent to-transparent" />
        </div>
      </div>

      {/* ASCII Tweet Columns - Fixed on sides */}
      <ASCIITweetColumns />

      {/* MAIN CONTENT - Single viewport */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 lg:px-24 xl:px-32">
        {/* Hero ASCII Animation - Takes up most of width */}
        <div className={`w-full max-w-6xl transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <ASCIISignalFlow />
        </div>

        {/* Setup Bar (appears above button when active) */}
        <AnimatePresence>
          {showSetupBar && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="w-full max-w-md overflow-hidden"
            >
              <InlineSetupBar onCancel={() => setShowSetupBar(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <FadeIn delay={2.5} duration={0.5}>
          <div className="mt-4">
            <Button
              variant="yellow"
              size="lg"
              onClick={() => setShowSetupBar(true)}
              disabled={showSetupBar}
              className={`px-8 py-3 text-sm font-medium shadow-lg shadow-tago-yellow-500/20 hover:shadow-tago-yellow-500/40 hover:scale-105 transition-all duration-200 ${
                showSetupBar ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Start Placing Narrative Trades
            </Button>
          </div>
        </FadeIn>
      </main>

      {/* Footer - Fixed at bottom */}
      <footer className="relative z-10 pb-4">
        <FadeIn delay={3} duration={0.5}>
          <div className="text-center space-y-2">
            {/* Key Concepts */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-white/30 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-tago-yellow-400/60 animate-pulse" />
                <span className="italic">Trade ideas</span>, not tokens
              </span>
              <span className="text-white/10 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
                One-click from <span className="italic">any chain</span>
              </span>
              <span className="text-white/10 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-400/60 animate-pulse" style={{ animationDelay: '1s' }} />
                <span className="italic">Non-custodial</span> risk control
              </span>
            </div>

            {/* Attribution */}
            <p className="text-[10px] text-white/20 font-mono">
              Powered by{' '}
              <a
                href="https://tagoresearch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="italic text-tago-yellow-400/40 hover:text-tago-yellow-400/70 transition-colors"
              >
                TAGO Research
              </a>
            </p>
          </div>
        </FadeIn>
      </footer>
    </div>
  );
}
