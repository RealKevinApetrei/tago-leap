'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  colorChange?: boolean;
}

export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  duration = 0.8,
  colorChange = false,
}: CountUpProps) {
  const prevValue = useRef(value);
  const isIncreasing = value > prevValue.current;

  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (latest) => {
    return `${prefix}${latest.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    prevValue.current = value;
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span
      className={cn(
        'tabular-nums',
        colorChange && (isIncreasing ? 'text-green-400' : 'text-red-400'),
        className
      )}
      animate={colorChange ? {
        scale: [1, 1.05, 1],
      } : undefined}
      transition={{ duration: 0.2 }}
    >
      {display}
    </motion.span>
  );
}

// Currency variant
export function CurrencyCountUp({
  value,
  className,
  colorChange = false,
}: {
  value: number;
  className?: string;
  colorChange?: boolean;
}) {
  return (
    <CountUp
      value={value}
      decimals={2}
      prefix="$"
      className={className}
      colorChange={colorChange}
    />
  );
}

// Percentage variant
export function PercentCountUp({
  value,
  className,
  showSign = false,
}: {
  value: number;
  className?: string;
  showSign?: boolean;
}) {
  const prefix = showSign && value >= 0 ? '+' : '';
  return (
    <CountUp
      value={value}
      decimals={1}
      prefix={prefix}
      suffix="%"
      className={cn(
        value >= 0 ? 'text-green-400' : 'text-red-400',
        className
      )}
    />
  );
}

// PnL variant with color coding
export function PnLCountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        isPositive ? 'text-green-400' : 'text-red-400',
        className
      )}
    >
      <CountUp
        value={Math.abs(value)}
        decimals={2}
        prefix={isPositive ? '+$' : '-$'}
        colorChange
      />
    </span>
  );
}
