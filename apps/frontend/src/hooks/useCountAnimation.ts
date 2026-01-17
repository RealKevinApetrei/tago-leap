'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountAnimationOptions {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseCountAnimationReturn {
  displayValue: string;
  rawValue: number;
  isAnimating: boolean;
}

// Easing functions
const easings = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export function useCountAnimation({
  value,
  duration = 500,
  decimals = 2,
  prefix = '',
  suffix = '',
  easing = 'easeOut',
  enabled = true,
  onComplete,
}: UseCountAnimationOptions): UseCountAnimationReturn {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValueRef = useRef(value);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(value);
      return;
    }

    const startValue = previousValueRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (diff === 0) return;

    setIsAnimating(true);
    const startTime = performance.now();
    const easingFn = easings[easing];

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const currentValue = startValue + diff * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        previousValueRef.current = endValue;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration, easing, enabled, onComplete]);

  // Format the display value
  const formatted = `${prefix}${displayValue.toFixed(decimals)}${suffix}`;

  return {
    displayValue: formatted,
    rawValue: displayValue,
    isAnimating,
  };
}

// Hook for animating currency values
export function useCurrencyAnimation(
  value: number,
  options?: Partial<Omit<UseCountAnimationOptions, 'value' | 'prefix'>>
) {
  return useCountAnimation({
    value,
    decimals: 2,
    prefix: '$',
    duration: 600,
    easing: 'easeOut',
    ...options,
  });
}

// Hook for animating percentages
export function usePercentAnimation(
  value: number,
  options?: Partial<Omit<UseCountAnimationOptions, 'value' | 'suffix'>>
) {
  return useCountAnimation({
    value,
    decimals: 1,
    suffix: '%',
    duration: 400,
    easing: 'easeOut',
    ...options,
  });
}

// Hook for price with sign indicator
export function usePnLAnimation(value: number) {
  const { displayValue, rawValue, isAnimating } = useCountAnimation({
    value: Math.abs(value),
    decimals: 2,
    duration: 500,
    easing: 'spring',
  });

  const sign = value >= 0 ? '+' : '-';
  const color = value >= 0 ? 'text-green-400' : 'text-red-400';

  return {
    displayValue: `${sign}$${displayValue}`,
    rawValue,
    isAnimating,
    color,
    isPositive: value >= 0,
  };
}
