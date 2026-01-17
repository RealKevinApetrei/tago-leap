'use client';

import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { useGlitchEffect } from '@/hooks/useGlitchEffect';
import { cn } from '@/lib/utils';

interface ASCIITextProps {
  text: string;
  className?: string;
  typing?: boolean;
  typingSpeed?: number;
  typingDelay?: number;
  glitch?: boolean;
  glitchIntensity?: number;
  cursor?: boolean;
  cursorChar?: '|' | '█' | '_' | '▌';
  highlight?: boolean;
  color?: 'white' | 'yellow' | 'green' | 'red' | 'blue' | 'purple';
  onTypingComplete?: () => void;
}

const colorClasses = {
  white: 'text-white',
  yellow: 'text-tago-yellow-400',
  green: 'text-green-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
};

export function ASCIIText({
  text,
  className,
  typing = false,
  typingSpeed = 40,
  typingDelay = 0,
  glitch = false,
  glitchIntensity = 0.1,
  cursor = false,
  cursorChar = '█',
  highlight = false,
  color = 'white',
  onTypingComplete,
}: ASCIITextProps) {
  const {
    displayText: typedText,
    cursor: cursorState,
    isComplete,
  } = useTypingAnimation({
    text,
    speed: typingSpeed,
    startDelay: typingDelay,
    cursor: cursorChar,
    enabled: typing,
    onComplete: onTypingComplete,
  });

  const { glitchedText } = useGlitchEffect({
    text: typing ? typedText : text,
    intensity: glitchIntensity,
    enabled: glitch && (!typing || isComplete),
  });

  const displayValue = glitch ? glitchedText : (typing ? typedText : text);

  return (
    <span
      className={cn(
        'font-mono whitespace-pre',
        colorClasses[color],
        highlight && 'bg-tago-yellow-400/20 px-1',
        className
      )}
      style={{
        fontFamily: "'Source Code Pro', 'SF Mono', monospace",
        textShadow: highlight ? '0 0 8px rgba(255, 214, 51, 0.4)' : undefined,
      }}
    >
      {displayValue}
      {cursor && !isComplete && (
        <span className="animate-pulse">{cursorState}</span>
      )}
    </span>
  );
}
