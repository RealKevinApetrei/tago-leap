'use client';

import { useState, useMemo, useEffect } from 'react';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';

interface RiskManagementTabProps {
  maxLeverage: string;
  setMaxLeverage: (value: string) => void;
  maxDailyNotional: string;
  setMaxDailyNotional: (value: string) => void;
  maxDrawdown: string;
  setMaxDrawdown: (value: string) => void;
  autoCloseEnabled?: boolean;
  setAutoCloseEnabled?: (value: boolean) => void;
  savingPolicy: boolean;
  onSavePolicy: (tokens: string[]) => Promise<void>;
  showToast: (type: 'error' | 'success', message: string) => void;
  allowedTokens: string[];
}

export function RiskManagementTab({
  maxLeverage,
  setMaxLeverage,
  maxDailyNotional,
  setMaxDailyNotional,
  maxDrawdown,
  setMaxDrawdown,
  autoCloseEnabled = false,
  setAutoCloseEnabled,
  savingPolicy,
  onSavePolicy,
  showToast,
  allowedTokens,
}: RiskManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(
    new Set(allowedTokens)
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Major']));

  // Fetch available assets from Pear/Hyperliquid
  const { assets: allTokens, categories: tokenCategories, isLoading: assetsLoading, error: assetsError, refresh: refreshAssets } = useAvailableAssets();

  // Sync selected tokens when allowedTokens prop changes
  useEffect(() => {
    setSelectedTokens(new Set(allowedTokens));
  }, [allowedTokens]);

  // Filter tokens by search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toUpperCase();
    return allTokens.filter(token => token.includes(query));
  }, [searchQuery, allTokens]);

  const toggleToken = (token: string) => {
    setSelectedTokens(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllInCategory = (category: string) => {
    const tokens = tokenCategories[category] || [];
    setSelectedTokens(prev => {
      const next = new Set(prev);
      tokens.forEach(token => next.add(token));
      return next;
    });
  };

  const deselectAllInCategory = (category: string) => {
    const tokens = tokenCategories[category] || [];
    setSelectedTokens(prev => {
      const next = new Set(prev);
      tokens.forEach(token => next.delete(token));
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTokens(new Set(allTokens));
  };

  const deselectAll = () => {
    setSelectedTokens(new Set());
  };

  const handleSave = async () => {
    if (selectedTokens.size === 0) {
      showToast('error', 'Please select at least one token');
      return;
    }
    await onSavePolicy(Array.from(selectedTokens));
  };

  return (
    <div className="space-y-6">
      {/* Position Limits */}
      <SwapPanel title="Position Limits" subtitle="Configure your trading constraints">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Max Leverage"
            type="number"
            value={maxLeverage}
            onChange={(e) => setMaxLeverage(e.target.value)}
            helperText="1-20x"
          />
          <Input
            label="Max Drawdown (%)"
            type="number"
            value={maxDrawdown}
            onChange={(e) => setMaxDrawdown(e.target.value)}
            helperText="Stop loss trigger"
          />
        </div>

        <Input
          label="Max Daily Notional (USD)"
          type="number"
          value={maxDailyNotional}
          onChange={(e) => setMaxDailyNotional(e.target.value)}
          helperText="Maximum total position size per day"
        />

        {/* Auto-Close Toggle */}
        {setAutoCloseEnabled && (
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] mt-4">
            <div>
              <span className="text-sm text-white font-medium">Auto-close on drawdown</span>
              <p className="text-xs text-white/40 mt-0.5">
                Automatically close all positions if drawdown exceeds your limit
              </p>
            </div>
            <button
              onClick={() => setAutoCloseEnabled(!autoCloseEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoCloseEnabled ? 'bg-tago-yellow-400' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  autoCloseEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        )}
      </SwapPanel>

      {/* Allowed Tokens */}
      <SwapPanel
        title="Allowed Tokens"
        subtitle={`${allTokens.length} tokens available from Hyperliquid`}
      >
        {/* Search and Quick Actions */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tokens..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-tago-yellow-400/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={selectAll}>All</Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>None</Button>
          <button
            onClick={refreshAssets}
            disabled={assetsLoading}
            className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh available tokens"
          >
            <svg className={`w-4 h-4 ${assetsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Selected Count */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs text-white/40">
            {selectedTokens.size} token{selectedTokens.size !== 1 ? 's' : ''} selected
          </span>
          {selectedTokens.size > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[70%] justify-end">
              {Array.from(selectedTokens).slice(0, 8).map(token => (
                <span key={token} className="text-xs bg-tago-yellow-400/20 text-tago-yellow-400 px-1.5 py-0.5 rounded">
                  {token}
                </span>
              ))}
              {selectedTokens.size > 8 && (
                <span className="text-xs text-white/40">+{selectedTokens.size - 8} more</span>
              )}
            </div>
          )}
        </div>

        {/* Search Results */}
        {filteredTokens && (
          <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
            <p className="text-xs text-white/40 mb-2">Search results</p>
            <div className="flex flex-wrap gap-1.5">
              {filteredTokens.length === 0 ? (
                <p className="text-sm text-white/30">No tokens found</p>
              ) : (
                filteredTokens.map(token => (
                  <button
                    key={token}
                    onClick={() => toggleToken(token)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      selectedTokens.has(token)
                        ? 'bg-tago-yellow-400 text-black font-medium'
                        : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                    }`}
                  >
                    {token}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Loading/Error State */}
        {assetsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-tago-yellow-400" />
            <span className="ml-2 text-sm text-white/40">Loading available tokens...</span>
          </div>
        )}

        {assetsError && !assetsLoading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-400">Failed to load tokens: {assetsError}</span>
              <Button variant="ghost" size="sm" onClick={refreshAssets}>Retry</Button>
            </div>
          </div>
        )}

        {/* Categories */}
        {!filteredTokens && !assetsLoading && (
          <div className="space-y-2">
            {Object.entries(tokenCategories).map(([category, tokens]) => {
              const selectedInCategory = tokens.filter(t => selectedTokens.has(t)).length;
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="bg-white/[0.02] rounded-xl border border-white/[0.05] overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm text-white font-medium">{category}</span>
                      <Badge variant={selectedInCategory > 0 ? 'yellow' : 'default'}>
                        {selectedInCategory}/{tokens.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => selectAllInCategory(category)}
                        className="text-xs text-white/40 hover:text-tago-yellow-400 px-2 py-1"
                      >
                        All
                      </button>
                      <button
                        onClick={() => deselectAllInCategory(category)}
                        className="text-xs text-white/40 hover:text-red-400 px-2 py-1"
                      >
                        None
                      </button>
                    </div>
                  </button>

                  {/* Category Tokens */}
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {tokens.map(token => (
                          <button
                            key={token}
                            onClick={() => toggleToken(token)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                              selectedTokens.has(token)
                                ? 'bg-tago-yellow-400 text-black font-medium'
                                : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                            }`}
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SwapPanel>

      {/* Save Button */}
      <Button
        variant="yellow"
        fullWidth
        size="lg"
        onClick={handleSave}
        loading={savingPolicy}
      >
        Save Risk Settings
      </Button>
    </div>
  );
}
