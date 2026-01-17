'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ASCIISignalFlow, MatrixRain, ASCIITweetColumns } from '@/components/ascii';
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

      {/* ASCII Tweet Columns */}
      <ASCIITweetColumns />

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 lg:px-32 xl:px-40">
        {/* Hero */}
        <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <ASCIISignalFlow />
        </div>

        {/* Setup Bar */}
        <AnimatePresence>
          {showSetupBar && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="w-full max-w-sm"
            >
              <InlineSetupBar onCancel={() => setShowSetupBar(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Button
            variant="yellow"
            size="lg"
            onClick={() => setShowSetupBar(true)}
            disabled={showSetupBar}
            className={`px-6 py-2.5 text-sm font-medium transition-all ${
              showSetupBar ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'
            }`}
          >
            Start Trading
          </Button>
        </motion.div>
      </main>

      {/* Footer - Compact */}
      <footer className="relative z-10 py-3 text-center">
        <p className="text-[9px] text-white/20 font-mono">
          <a
            href="https://tagoresearch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition-colors"
          >
            TAGO Research
          </a>
          {' · '}
          <span className="text-white/15">Non-custodial · Any chain</span>
        </p>
      </footer>
    </div>
  );
}
