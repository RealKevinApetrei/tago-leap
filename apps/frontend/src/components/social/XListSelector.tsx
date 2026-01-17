'use client';

import { useState, useRef, useEffect } from 'react';

interface XList {
  id: string;
  name: string;
  memberCount: number;
  description?: string;
}

interface XListSelectorProps {
  lists: XList[];
  selectedListId: string | null;
  onSelect: (listId: string | null) => void;
  isLoading: boolean;
}

export function XListSelector({
  lists,
  selectedListId,
  onSelect,
  isLoading,
}: XListSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedList = lists.find(l => l.id === selectedListId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/40">
        <ListIcon className="w-4 h-4" />
        <span className="text-sm">Loading lists...</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors"
      >
        <ListIcon className="w-4 h-4" />
        <span className="text-sm truncate max-w-32">
          {selectedList ? selectedList.name : 'All Crypto'}
        </span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 py-2 rounded-xl bg-black/90 backdrop-blur-xl border border-white/[0.1] shadow-xl z-50">
          {/* Default Option */}
          <button
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className={`
              w-full px-4 py-2 text-left hover:bg-white/[0.05] transition-colors
              ${selectedListId === null ? 'bg-white/[0.05]' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">All Crypto</p>
                <p className="text-xs text-white/40">Curated crypto accounts</p>
              </div>
              {selectedListId === null && (
                <CheckIcon className="w-4 h-4 text-[#E8FF00]" />
              )}
            </div>
          </button>

          {lists.length > 0 && (
            <>
              <div className="my-2 border-t border-white/[0.06]" />
              <p className="px-4 py-1 text-xs text-white/40 uppercase tracking-wider">Your Lists</p>
            </>
          )}

          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => {
                onSelect(list.id);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-left hover:bg-white/[0.05] transition-colors
                ${selectedListId === list.id ? 'bg-white/[0.05]' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{list.name}</p>
                  <p className="text-xs text-white/40">{list.memberCount} members</p>
                </div>
                {selectedListId === list.id && (
                  <CheckIcon className="w-4 h-4 text-[#E8FF00] flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          ))}

          {lists.length === 0 && (
            <p className="px-4 py-3 text-sm text-white/40 text-center">
              No lists found. Create lists on X to see them here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Icons
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
