'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface SlideInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.4,
  className,
  ...props
}: SlideInProps) {
  const offsets = {
    left: { x: '-100%' },
    right: { x: '100%' },
    top: { y: '-100%' },
    bottom: { y: '100%' },
  };

  return (
    <motion.div
      initial={{ ...offsets[direction], opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{
        duration,
        delay,
        type: 'spring',
        stiffness: 100,
        damping: 20,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Variant with exit animation
export function SlideInOut({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.3,
  className,
  ...props
}: SlideInProps) {
  const offsets = {
    left: { x: '-100%' },
    right: { x: '100%' },
    top: { y: '-100%' },
    bottom: { y: '100%' },
  };

  const exitOffsets = {
    left: { x: '100%' },
    right: { x: '-100%' },
    top: { y: '100%' },
    bottom: { y: '-100%' },
  };

  return (
    <motion.div
      initial={{ ...offsets[direction], opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={{ ...exitOffsets[direction], opacity: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.32, 0.72, 0, 1], // Custom easing for slide
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
