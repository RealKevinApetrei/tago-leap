'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type LoaderStyle = 'spinner' | 'dots' | 'bar' | 'brain' | 'blocks';

interface ASCIILoaderProps {
  style?: LoaderStyle;
  className?: string;
  text?: string;
  progress?: number; // 0-100 for bar style
  color?: 'white' | 'yellow';
}

const SPINNER_FRAMES = ['◐', '◓', '◑', '◒'];
const DOTS_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BRAIN_FRAMES = ['◠◡◠◡◠', '◡◠◡◠◡', '◠◡◠◡◠', '◡◠◡◠◡'];
const BLOCKS_FRAMES = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];

export function ASCIILoader({
  style = 'spinner',
  className,
  text,
  progress,
  color = 'yellow',
}: ASCIILoaderProps) {
  const [frame, setFrame] = useState(0);

  const frames = {
    spinner: SPINNER_FRAMES,
    dots: DOTS_FRAMES,
    brain: BRAIN_FRAMES,
    blocks: BLOCKS_FRAMES,
    bar: [''], // Bar doesn't use frames
  };

  useEffect(() => {
    if (style === 'bar') return;

    const interval = setInterval(() => {
      setFrame(f => (f + 1) % frames[style].length);
    }, style === 'dots' ? 80 : 150);

    return () => clearInterval(interval);
  }, [style]);

  const colorClass = color === 'yellow' ? 'text-tago-yellow-400' : 'text-white';

  if (style === 'bar' && progress !== undefined) {
    const filled = Math.floor(progress / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return (
      <span className={cn('font-mono', colorClass, className)}>
        [{bar}] {progress}%{text && ` ${text}`}
      </span>
    );
  }

  return (
    <span className={cn('font-mono inline-flex items-center gap-2', colorClass, className)}>
      <span className="inline-block w-4 text-center">{frames[style][frame]}</span>
      {text && <span className="text-white/60">{text}</span>}
    </span>
  );
}

// Compound loading states for common scenarios
export function TradeGeneratingLoader() {
  return (
    <div className="flex items-center gap-3 text-sm">
      <ASCIILoader style="brain" />
      <span className="text-white/60">Analyzing narrative...</span>
    </div>
  );
}

export function ExecutingTradeLoader({ progress }: { progress?: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {progress !== undefined ? (
        <ASCIILoader style="bar" progress={progress} />
      ) : (
        <>
          <ASCIILoader style="spinner" />
          <span className="text-white/60">Executing trade...</span>
        </>
      )}
    </div>
  );
}

export function LoadingTweetsLoader() {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40">
      <ASCIILoader style="dots" color="white" />
      <span>Loading tweets...</span>
    </div>
  );
}
