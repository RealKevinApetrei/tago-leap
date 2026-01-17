'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypingAnimationOptions {
  text: string;
  speed?: number;
  startDelay?: number;
  cursor?: '|' | '█' | '_' | '▌';
  cursorBlink?: boolean;
  onCharacter?: (char: string, index: number) => void;
  onComplete?: () => void;
  enabled?: boolean;
  /** Number of characters to type per tick (default: 1) */
  chunkSize?: number;
}

interface UseTypingAnimationReturn {
  displayText: string;
  isTyping: boolean;
  isComplete: boolean;
  cursor: string;
  progress: number;
  reset: () => void;
  skip: () => void;
}

export function useTypingAnimation({
  text,
  speed = 40,
  startDelay = 0,
  cursor = '█',
  cursorBlink = true,
  onCharacter,
  onComplete,
  enabled = true,
  chunkSize = 1,
}: UseTypingAnimationOptions): UseTypingAnimationReturn {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blinkRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (blinkRef.current) clearInterval(blinkRef.current);
    indexRef.current = 0;
    setDisplayText('');
    setIsTyping(false);
    setIsComplete(false);
    setShowCursor(true);
  }, []);

  const skip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    indexRef.current = text.length;
    setDisplayText(text);
    setIsTyping(false);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete]);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    const startTyping = () => {
      setIsTyping(true);

      const typeChar = () => {
        if (indexRef.current < text.length) {
          // Type chunkSize characters at once
          const endIndex = Math.min(indexRef.current + chunkSize, text.length);
          const chunk = text.slice(indexRef.current, endIndex);
          setDisplayText(text.slice(0, endIndex));

          // Callback for each character in chunk
          for (let i = indexRef.current; i < endIndex; i++) {
            onCharacter?.(text[i], i);
          }
          indexRef.current = endIndex;

          // Variable speed for more natural typing (only for single char mode)
          const variance = chunkSize === 1 ? Math.random() * 20 - 10 : 0;
          const nextSpeed = speed + variance;

          timeoutRef.current = setTimeout(typeChar, Math.max(1, nextSpeed));
        } else {
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
        }
      };

      typeChar();
    };

    timeoutRef.current = setTimeout(startTyping, startDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, speed, startDelay, enabled, onCharacter, onComplete, reset]);

  // Cursor blink effect
  useEffect(() => {
    if (!cursorBlink || isComplete) {
      setShowCursor(!isComplete);
      return;
    }

    blinkRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, [cursorBlink, isComplete]);

  return {
    displayText,
    isTyping,
    isComplete,
    cursor: showCursor ? cursor : ' ',
    progress: text.length > 0 ? displayText.length / text.length : 0,
    reset,
    skip,
  };
}
