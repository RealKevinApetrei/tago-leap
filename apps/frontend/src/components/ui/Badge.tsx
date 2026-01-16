import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'yellow';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-light tracking-wide';

  const variantStyles = {
    default: 'bg-white/10 text-white/70',
    success: 'bg-green-500/15 text-green-400',
    warning: 'bg-amber-500/15 text-amber-400',
    error: 'bg-red-500/15 text-red-400',
    info: 'bg-blue-500/15 text-blue-400',
    yellow: 'bg-tago-yellow-400/15 text-tago-yellow-400',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
