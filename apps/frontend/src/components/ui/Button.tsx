import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'yellow' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-normal tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-tago-yellow-400 focus:ring-offset-2 focus:ring-offset-tago-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variantStyles = {
    // Primary white button
    primary:
      'bg-white text-black hover:bg-white/90 shadow-lg shadow-white/5',
    // Yellow accent button
    yellow:
      'bg-gradient-to-r from-tago-yellow-400 to-tago-yellow-500 hover:from-tago-yellow-300 hover:to-tago-yellow-400 text-black font-medium shadow-lg shadow-tago-yellow-500/20 hover:shadow-tago-yellow-500/30 btn-glow',
    // Ghost button
    ghost:
      'bg-transparent text-white border border-white/10 hover:border-white/20 hover:bg-white/5 font-light',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
