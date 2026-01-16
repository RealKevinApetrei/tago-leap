'use client';

interface TabItem {
  label: string;
  value: string;
  active?: boolean;
}

interface TabsProps {
  items: TabItem[];
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, onChange, className = '' }: TabsProps) {
  return (
    <div
      className={`inline-flex items-center bg-white/5 rounded-xl p-1 gap-1 ${className}`}
    >
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`
            relative px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-all duration-300
            ${
              item.active
                ? 'bg-gradient-to-r from-tago-yellow-400 to-tago-yellow-500 text-black font-medium shadow-lg shadow-tago-yellow-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }
          `}
        >
          {item.label}
          {item.active && (
            <span className="absolute inset-0 rounded-lg bg-tago-yellow-400/20 blur-xl -z-10" />
          )}
        </button>
      ))}
    </div>
  );
}
