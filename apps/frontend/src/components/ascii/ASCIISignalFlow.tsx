'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ASCIISignalFlowProps {
  className?: string;
}

export function ASCIISignalFlow({ className }: ASCIISignalFlowProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`relative flex flex-col items-center justify-center text-center w-full ${className || ''}`}>
      {/* Main Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Trade Ideas
        </h1>
      </motion.div>

      {/* Second line */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-1"
      >
        <h2 className="text-white/70 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Not Tokens
        </h2>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-4 text-white/60 text-sm sm:text-base font-normal tracking-wide max-w-md"
      >
        AI-powered pair trading that turns market narratives into automated positions
      </motion.p>
    </div>
  );
}
