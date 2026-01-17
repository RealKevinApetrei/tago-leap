'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface UseAutoScrollOptions {
  /** Speed in pixels per second (default: 30) */
  speed?: number;
  /** Pause scrolling when hovering (default: true) */
  pauseOnHover?: boolean;
  /** Enable auto-scroll (default: true) */
  enabled?: boolean;
  /** Pause duration after reaching end before restarting (ms, default: 2000) */
  endPauseDuration?: number;
}

interface UseAutoScrollReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Whether auto-scrolling is currently active */
  isScrolling: boolean;
  /** Whether scrolling is paused (due to hover or other) */
  isPaused: boolean;
  /** Manually pause scrolling */
  pause: () => void;
  /** Resume scrolling */
  resume: () => void;
  /** Scroll to a specific position */
  scrollTo: (position: number) => void;
}

/**
 * Hook for smooth auto-scrolling with hover-to-pause functionality.
 * Uses requestAnimationFrame for smooth 60fps scrolling.
 */
export function useAutoScroll({
  speed = 30,
  pauseOnHover = true,
  enabled = true,
  endPauseDuration = 2000,
}: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isHoveringRef = useRef<boolean>(false);

  const [isScrolling, setIsScrolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  );

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!containerRef.current || isPausedRef.current || !enabled || prefersReducedMotion.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;

    // Skip if nothing to scroll
    if (maxScroll <= 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    // Calculate time delta
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Calculate scroll amount based on speed and time
    const scrollAmount = (speed * delta) / 1000;

    // Get current scroll position
    const currentScroll = container.scrollTop;
    const newScroll = currentScroll + scrollAmount;

    // Check if we've reached the end
    if (newScroll >= maxScroll) {
      container.scrollTop = maxScroll;
      setIsScrolling(false);

      // Pause at end, then reset to top
      setTimeout(() => {
        if (containerRef.current && !isPausedRef.current) {
          containerRef.current.scrollTop = 0;
          setIsScrolling(true);
        }
      }, endPauseDuration);
    } else {
      container.scrollTop = newScroll;
      setIsScrolling(true);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [speed, enabled, endPauseDuration]);

  // Start/stop animation based on enabled state
  useEffect(() => {
    if (enabled && !prefersReducedMotion.current) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, animate]);

  // Handle hover events
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pauseOnHover) return;

    const handleMouseEnter = () => {
      isHoveringRef.current = true;
      isPausedRef.current = true;
      setIsPaused(true);
      setIsScrolling(false);
    };

    const handleMouseLeave = () => {
      isHoveringRef.current = false;
      isPausedRef.current = false;
      setIsPaused(false);
      lastTimeRef.current = 0; // Reset time for smooth resume
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [pauseOnHover]);

  // Manual pause
  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setIsScrolling(false);
  }, []);

  // Manual resume
  const resume = useCallback(() => {
    if (!isHoveringRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      lastTimeRef.current = 0;
    }
  }, []);

  // Scroll to position
  const scrollTo = useCallback((position: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = position;
    }
  }, []);

  return {
    containerRef,
    isScrolling,
    isPaused,
    pause,
    resume,
    scrollTo,
  };
}
