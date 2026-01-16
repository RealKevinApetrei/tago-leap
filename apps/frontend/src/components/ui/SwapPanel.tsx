'use client';

import { ReactNode } from 'react';
import { Card } from './Card';

interface SwapPanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SwapPanel({ title, subtitle, children, footer, className = '' }: SwapPanelProps) {
  return (
    <Card className={`max-w-md mx-auto ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-light text-white">
            <span className="italic text-tago-yellow-400">{title.split(' ')[0]}</span>
            {title.split(' ').slice(1).length > 0 && ' ' + title.split(' ').slice(1).join(' ')}
          </h2>
          {subtitle && (
            <p className="text-sm text-white/40 font-light mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-6 space-y-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/5">{footer}</div>
      )}
    </Card>
  );
}

interface SwapFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  token?: {
    symbol: string;
    icon?: string;
  };
  balance?: string;
  onMaxClick?: () => void;
  disabled?: boolean;
}

export function SwapField({
  label,
  value,
  onChange,
  token,
  balance,
  onMaxClick,
  disabled = false,
}: SwapFieldProps) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] transition-all duration-200 hover:border-white/15 focus-within:border-tago-yellow-400 focus-within:ring-1 focus-within:ring-tago-yellow-400/20">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white/40 font-light">{label}</span>
        {balance && (
          <span className="text-sm text-white/40 font-light">
            Balance: {balance}
            {onMaxClick && (
              <button
                onClick={onMaxClick}
                className="ml-2 text-tago-yellow-400 hover:text-tago-yellow-300 transition-colors font-medium"
              >
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          disabled={disabled}
          className="flex-1 bg-transparent text-2xl font-light text-white placeholder-white/20 focus:outline-none disabled:opacity-50"
        />
        {token && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
            {token.icon && (
              <span className="text-xl">{token.icon}</span>
            )}
            <span className="font-medium text-white">{token.symbol}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SwapDivider() {
  return (
    <div className="flex justify-center -my-2 relative z-10">
      <div className="p-2 bg-black rounded-xl border border-white/10 shadow-lg">
        <svg
          className="w-5 h-5 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </div>
  );
}
