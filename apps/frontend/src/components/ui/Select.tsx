import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-light transition-all duration-200 focus:border-tago-yellow-400 focus:ring-2 focus:ring-tago-yellow-400/15 hover:border-white/15 appearance-none cursor-pointer';

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
        <div className="relative">
          <select
            ref={ref}
            className={`${baseStyles} ${errorStyles} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-black text-white/40">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-black text-white">
                {option.label}
              </option>
            ))}
          </select>
          {/* Dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && <p className="text-sm text-red-400 font-light">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
