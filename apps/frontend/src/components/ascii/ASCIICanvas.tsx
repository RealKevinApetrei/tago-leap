'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ASCIICanvasProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  scanlines?: boolean;
  noise?: boolean;
  background?: 'transparent' | 'terminal' | 'glass';
}

export function ASCIICanvas({
  children,
  className,
  glow = false,
  scanlines = false,
  noise = false,
  background = 'transparent',
}: ASCIICanvasProps) {
  const bgClasses = {
    transparent: '',
    terminal: 'bg-black/80',
    glass: 'bg-white/[0.02] backdrop-blur-sm border border-white/[0.05]',
  };

  return (
    <div
      className={cn(
        'relative font-mono text-sm leading-tight overflow-hidden',
        bgClasses[background],
        glow && 'ascii-glow',
        className
      )}
      style={{
        fontFamily: "'Source Code Pro', 'SF Mono', 'Monaco', 'Inconsolata', monospace",
        textShadow: glow ? '0 0 10px rgba(255, 214, 51, 0.5), 0 0 20px rgba(255, 214, 51, 0.3)' : undefined,
      }}
    >
      {/* Scanlines overlay */}
      {scanlines && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
          }}
        />
      )}

      {/* Static noise overlay */}
      {noise && (
        <div
          className="pointer-events-none absolute inset-0 z-10 animate-pulse opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-0">{children}</div>
    </div>
  );
}
