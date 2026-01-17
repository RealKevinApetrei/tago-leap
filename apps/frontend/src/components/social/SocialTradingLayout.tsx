'use client';

import { ReactNode } from 'react';

interface SocialTradingLayoutProps {
  leftColumn: ReactNode;
  centerColumn: ReactNode;
  rightColumn: ReactNode;
  bottomPanel: ReactNode;
  header?: ReactNode;
}

/**
 * Social Trading Layout
 *
 * Desktop: 3-column grid (top 2/3) + horizontal control panel (bottom 1/3)
 * Tablet: 2-column grid + compact bottom panel
 * Mobile: Single column with tabs + bottom sheet
 */
export function SocialTradingLayout({
  leftColumn,
  centerColumn,
  rightColumn,
  bottomPanel,
  header,
}: SocialTradingLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden pl-12 pr-12">
      {/* Optional Header (X Account Connect, List Selector) */}
      {header && (
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
          {header}
        </div>
      )}

      {/* Main Content Area - Top 2/3 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Desktop: 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-3 h-full gap-0 divide-x divide-white/[0.06]">
          {/* Left Column - AI/Tech */}
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {leftColumn}
          </div>

          {/* Center Column - Trending/Hot or Custom Input */}
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {centerColumn}
          </div>

          {/* Right Column - Meme/DeFi */}
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {rightColumn}
          </div>
        </div>

        {/* Tablet: 2 columns */}
        <div className="hidden md:grid md:grid-cols-2 lg:hidden h-full gap-0 divide-x divide-white/[0.06]">
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {leftColumn}
          </div>
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {centerColumn}
          </div>
        </div>

        {/* Mobile: Single column with horizontal scroll tabs */}
        <div className="md:hidden h-full overflow-y-auto">
          {centerColumn}
        </div>
      </div>

      {/* Bottom Panel - Trade Controls (1/3 height on desktop, fixed on mobile) */}
      <div className="flex-shrink-0 border-t border-white/[0.06] bg-black/40 backdrop-blur-xl">
        {/* Desktop/Tablet: Full panel */}
        <div className="hidden md:block">
          {bottomPanel}
        </div>

        {/* Mobile: Compact floating bar */}
        <div className="md:hidden">
          {bottomPanel}
        </div>
      </div>
    </div>
  );
}

/**
 * Column Header Component
 */
interface ColumnHeaderProps {
  title: string;
  badge?: string;
  action?: ReactNode;
}

export function ColumnHeader({ title, badge, action }: ColumnHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-white/90">{title}</h2>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/[0.08] text-white/60">
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Mobile Category Tabs
 */
interface CategoryTabsProps {
  categories: { id: string; label: string; count?: number }[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-none bg-black/40 border-b border-white/[0.06]">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`
            flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${activeCategory === cat.id
              ? 'bg-[#E8FF00] text-black'
              : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white'
            }
          `}
        >
          {cat.label}
          {cat.count !== undefined && (
            <span className={`ml-1.5 ${activeCategory === cat.id ? 'text-black/60' : 'text-white/40'}`}>
              {cat.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
