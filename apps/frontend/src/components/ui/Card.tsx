import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'featured' | 'solid';
  hoverable?: boolean;
}

export function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
}: CardProps) {
  const baseStyles = 'rounded-2xl overflow-hidden transition-all duration-500';

  const variantStyles = {
    default: 'glass-card',
    featured: 'glass-card-featured',
    solid: 'bg-surface border border-border',
  };

  const hoverStyles = hoverable ? 'card-hover hover:border-border-hover group' : '';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-white/5 ${className}`}>
      {children}
    </div>
  );
}

// Decorative line component for cards
export function CardDivider() {
  return <div className="decorative-line mx-6 my-4" />;
}
