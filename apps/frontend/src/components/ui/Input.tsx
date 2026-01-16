import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/40 font-light transition-all duration-200 focus:border-tago-yellow-400 focus:ring-2 focus:ring-tago-yellow-400/15 hover:border-white/15';

    const errorStyles = error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
      : '';

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-light text-white/70">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${errorStyles} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-400 font-light">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-white/40 font-light">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
