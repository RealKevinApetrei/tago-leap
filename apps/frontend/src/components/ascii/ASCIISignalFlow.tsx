'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ASCIISignalFlowProps {
  className?: string;
}

const FEATURES = [
  { label: 'Non-Custodial', icon: '◆' },
  { label: 'Cross-Chain', icon: '◆' },
  { label: 'AI-Powered', icon: '◆' },
  { label: 'Hyperliquid', icon: '◆' },
];

export function ASCIISignalFlow({ className }: ASCIISignalFlowProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`relative flex flex-col items-center text-center w-full ${className || ''}`}>
      {/* ASCII Stars decoration - top */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl pointer-events-none"
      >
        <div className="flex justify-between px-8 text-tago-yellow-400/30 font-mono text-xs">
          <span>✦</span>
          <span>·</span>
          <span>✧</span>
          <span>·</span>
          <span>★</span>
          <span>·</span>
          <span>✧</span>
          <span>·</span>
          <span>✦</span>
        </div>
      </motion.div>

      {/* Main Title with stars */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        {/* Side stars */}
        <span className="absolute -left-12 top-1/2 -translate-y-1/2 text-tago-yellow-400/40 font-mono text-2xl hidden sm:block">
          ✦ ✧
        </span>
        <span className="absolute -right-12 top-1/2 -translate-y-1/2 text-tago-yellow-400/40 font-mono text-2xl hidden sm:block">
          ✧ ✦
        </span>

        {/* Title */}
        <motion.h1
          className="text-tago-yellow-400 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight select-none"
          animate={{
            textShadow: [
              '0 0 30px rgba(255, 214, 51, 0.3), 0 0 60px rgba(255, 214, 51, 0.15)',
              '0 0 40px rgba(255, 214, 51, 0.5), 0 0 80px rgba(255, 214, 51, 0.25)',
              '0 0 30px rgba(255, 214, 51, 0.3), 0 0 60px rgba(255, 214, 51, 0.15)',
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            textShadow: '0 0 30px rgba(255, 214, 51, 0.3), 0 0 60px rgba(255, 214, 51, 0.15)',
          }}
        >
          TAGO LEAP
        </motion.h1>
      </motion.div>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-3"
      >
        <span className="text-white/40 text-xs sm:text-sm tracking-[0.2em] font-mono uppercase">
          AI Narrative Trading on Hyperliquid
        </span>
      </motion.div>

      {/* Feature boxes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-5 flex flex-wrap justify-center gap-2"
      >
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-white/5"
          >
            <span className="text-tago-yellow-400 text-[10px]">{feature.icon}</span>
            <span className="text-white/50 text-[10px] font-mono uppercase tracking-wide">{feature.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ASCII Stars decoration - bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 text-tago-yellow-400/20 font-mono text-[10px] tracking-[0.5em]"
      >
        · · · ✦ · · ·
      </motion.div>
    </div>
  );
}
