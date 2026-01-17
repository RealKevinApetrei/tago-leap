'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?░▒▓█▀▄▌▐';

interface UseGlitchEffectOptions {
  text: string;
  intensity?: number; // 0-1, how often glitches occur
  duration?: number; // How long each glitch lasts (ms)
  interval?: number; // Time between glitch attempts (ms)
  enabled?: boolean;
  preserveSpaces?: boolean;
}

interface UseGlitchEffectReturn {
  glitchedText: string;
  isGlitching: boolean;
  triggerGlitch: () => void;
}

export function useGlitchEffect({
  text,
  intensity = 0.1,
  duration = 100,
  interval = 2000,
  enabled = true,
  preserveSpaces = true,
}: UseGlitchEffectOptions): UseGlitchEffectReturn {
  const [glitchedText, setGlitchedText] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const glitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyGlitch = useCallback((sourceText: string, glitchIntensity: number) => {
    return sourceText
      .split('')
      .map((char) => {
        if (preserveSpaces && char === ' ') return char;
        if (Math.random() < glitchIntensity) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return char;
      })
      .join('');
  }, [preserveSpaces]);

  const triggerGlitch = useCallback(() => {
    if (!enabled) return;

    setIsGlitching(true);

    // Apply multiple rapid glitch frames
    const glitchFrames = 3;
    let frame = 0;

    const animateGlitch = () => {
      if (frame < glitchFrames) {
        setGlitchedText(applyGlitch(text, intensity * 3)); // Intense during glitch
        frame++;
        glitchTimeoutRef.current = setTimeout(animateGlitch, duration / glitchFrames);
      } else {
        setGlitchedText(text);
        setIsGlitching(false);
      }
    };

    animateGlitch();
  }, [text, intensity, duration, enabled, applyGlitch]);

  // Periodic glitch effect
  useEffect(() => {
    if (!enabled) {
      setGlitchedText(text);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (Math.random() < intensity) {
        triggerGlitch();
      }
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
    };
  }, [text, intensity, interval, enabled, triggerGlitch]);

  // Update text when source changes
  useEffect(() => {
    if (!isGlitching) {
      setGlitchedText(text);
    }
  }, [text, isGlitching]);

  return {
    glitchedText,
    isGlitching,
    triggerGlitch,
  };
}

// Heavy glitch effect for dramatic moments
export function useHeavyGlitch(text: string, enabled = false) {
  const [output, setOutput] = useState(text);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setOutput(text);
      return;
    }

    const animate = () => {
      const glitched = text
        .split('')
        .map((char) => {
          if (char === ' ') return char;
          if (Math.random() < 0.3) {
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          }
          return char;
        })
        .join('');

      setOutput(glitched);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, enabled]);

  return output;
}
