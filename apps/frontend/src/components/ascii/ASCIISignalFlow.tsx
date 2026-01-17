'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ASCIISignalFlowProps {
  className?: string;
}

// The main ASCII art - TAGO LEAP logo
const LOGO_ART = `
████████╗ █████╗  ██████╗  ██████╗     ██╗     ███████╗ █████╗ ██████╗
╚══██╔══╝██╔══██╗██╔════╝ ██╔═══██╗    ██║     ██╔════╝██╔══██╗██╔══██╗
   ██║   ███████║██║  ███╗██║   ██║    ██║     █████╗  ███████║██████╔╝
   ██║   ██╔══██║██║   ██║██║   ██║    ██║     ██╔══╝  ██╔══██║██╔═══╝
   ██║   ██║  ██║╚██████╔╝╚██████╔╝    ███████╗███████╗██║  ██║██║
   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝
`.trim();

const SUBTITLE = 'AI-Powered Narrative Trading on Hyperliquid';

export function ASCIISignalFlow({ className }: ASCIISignalFlowProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`relative flex flex-col items-center text-center w-full ${className || ''}`}>
      {/* Logo - Super large with subtle flicker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full"
      >
        <motion.pre
          className="text-tago-yellow-400 text-[6px] xs:text-[8px] sm:text-[12px] md:text-[16px] lg:text-[20px] xl:text-[24px] leading-[1.1] select-none font-mono whitespace-pre"
          animate={{
            opacity: [1, 0.85, 1, 0.9, 1],
            textShadow: [
              '0 0 20px rgba(255, 214, 51, 0.4)',
              '0 0 30px rgba(255, 214, 51, 0.6)',
              '0 0 20px rgba(255, 214, 51, 0.4)',
              '0 0 25px rgba(255, 214, 51, 0.5)',
              '0 0 20px rgba(255, 214, 51, 0.4)',
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            textShadow: '0 0 20px rgba(255, 214, 51, 0.4)',
          }}
        >
          {LOGO_ART}
        </motion.pre>

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.1) 50%)',
            backgroundSize: '100% 4px',
          }}
        />
      </motion.div>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6"
      >
        <span className="text-white/40 text-xs sm:text-sm md:text-base tracking-[0.15em] font-mono uppercase">
          {SUBTITLE}
        </span>
      </motion.div>
    </div>
  );
}
