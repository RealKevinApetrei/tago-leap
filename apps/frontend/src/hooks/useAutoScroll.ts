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
  /** Ref callback to attach to the scrollable container */
  containerRef: (node: HTMLDivElement | null) => void;
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
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isHoveringRef = useRef<boolean>(false);
  const isEndPauseRef = useRef<boolean>(false);

  const [isScrolling, setIsScrolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  );

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    const container = containerNodeRef.current;

    if (!container || isPausedRef.current || !enabled || prefersReducedMotion.current || isEndPauseRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

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
      isEndPauseRef.current = true;

      // Pause at end, then reset to top
      setTimeout(() => {
        if (containerNodeRef.current && !isPausedRef.current) {
          containerNodeRef.current.scrollTop = 0;
          isEndPauseRef.current = false;
          lastTimeRef.current = 0;
          setIsScrolling(true);
        } else {
          isEndPauseRef.current = false;
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
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [enabled, animate]);

  // Callback ref to handle container attachment and hover events
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup old node
    if (containerNodeRef.current && pauseOnHover) {
      const oldNode = containerNodeRef.current;
      oldNode.removeEventListener('mouseenter', handleMouseEnter);
      oldNode.removeEventListener('mouseleave', handleMouseLeave);
    }

    containerNodeRef.current = node;

    // Setup new node
    if (node && pauseOnHover) {
      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mouseleave', handleMouseLeave);
    }

    function handleMouseEnter() {
      isHoveringRef.current = true;
      isPausedRef.current = true;
      setIsPaused(true);
      setIsScrolling(false);
    }

    function handleMouseLeave() {
      isHoveringRef.current = false;
      isPausedRef.current = false;
      setIsPaused(false);
      lastTimeRef.current = 0; // Reset time for smooth resume
    }
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
    if (containerNodeRef.current) {
      containerNodeRef.current.scrollTop = position;
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
