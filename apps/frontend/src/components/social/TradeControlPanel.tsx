'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { NarrativeSuggestion } from '@/lib/api';

interface TradeControlPanelProps {
  suggestion: NarrativeSuggestion | null;
  stakeUsd: string;
  leverage: number;
  maxLeverage: number;
  availableBalance: number;
  isGenerating: boolean;
  isExecuting: boolean;
  onStakeChange: (value: string) => void;
  onLeverageChange: (value: number) => void;
  onExecute: () => void;
  onClear: () => void;
  accountHealth?: number;
}

export function TradeControlPanel({
  suggestion,
  stakeUsd,
  leverage,
  maxLeverage,
  availableBalance,
  isGenerating,
  isExecuting,
  onStakeChange,
  onLeverageChange,
  onExecute,
  onClear,
  accountHealth = 100,
}: TradeControlPanelProps) {
  const stake = parseFloat(stakeUsd) || 0;
  const notional = stake * leverage;
  const hasInsufficientBalance = stake > availableBalance;
  const isMinNotionalMet = notional >= 10;
  const canExecute = suggestion && !hasInsufficientBalance && isMinNotionalMet && !isExecuting;

  return (
    <div className="p-4 md:p-6">
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-center gap-6">
        {/* Trade Preview (Left) */}
        <div className="flex-shrink-0 w-64">
          {suggestion ? (
            <TradePreview suggestion={suggestion} onClear={onClear} />
          ) : (
            <div className="flex items-center justify-center h-20 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1]">
              <p className="text-sm text-white/40">
                {isGenerating ? 'Generating trade...' : 'Select a tweet to trade'}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-16 w-px bg-white/[0.1]" />

        {/* Stake Input */}
        <div className="w-36">
          <label className="block text-xs text-white/50 mb-1.5">Stake (USD)</label>
          <Input
            type="number"
            value={stakeUsd}
            onChange={(e) => onStakeChange(e.target.value)}
            placeholder="100"
            min="1"
            className="h-10 text-center font-medium"
          />
        </div>

        {/* Leverage Slider */}
        <div className="w-48">
          <label className="block text-xs text-white/50 mb-1.5">
            Leverage: <span className="text-white font-medium">{leverage}x</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max={maxLeverage}
              value={leverage}
              onChange={(e) => onLeverageChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#E8FF00]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110"
            />
          </div>
        </div>

        {/* Trade Summary */}
        <div className="flex-1 flex items-center gap-6">
          <div>
            <span className="text-xs text-white/50">Notional</span>
            <p className={`text-lg font-semibold ${notional >= 10 ? 'text-[#E8FF00]' : 'text-red-400'}`}>
              ${notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <span className="text-xs text-white/50">Available</span>
            <p className={`text-lg font-semibold ${hasInsufficientBalance ? 'text-red-400' : 'text-white/90'}`}>
              ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {accountHealth < 100 && (
            <div>
              <span className="text-xs text-white/50">Health</span>
              <p className={`text-lg font-semibold ${accountHealth < 50 ? 'text-red-400' : 'text-white/90'}`}>
                {accountHealth.toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {/* Execute Button */}
        <Button
          onClick={onExecute}
          disabled={!canExecute}
          className={`
            h-12 px-8 text-base font-semibold rounded-xl transition-all
            ${canExecute
              ? 'bg-[#E8FF00] text-black hover:bg-[#d4eb00]'
              : 'bg-white/[0.1] text-white/40 cursor-not-allowed'
            }
          `}
        >
          {isExecuting ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Executing...
            </span>
          ) : isGenerating ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Generating...
            </span>
          ) : (
            'Execute Trade'
          )}
        </Button>
      </div>

      {/* Mobile: Stacked Layout */}
      <div className="md:hidden space-y-4">
        {/* Trade Preview */}
        {suggestion ? (
          <TradePreview suggestion={suggestion} onClear={onClear} compact />
        ) : (
          <div className="flex items-center justify-center h-16 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1]">
            <p className="text-sm text-white/40">
              {isGenerating ? 'Generating trade...' : 'Select a tweet to trade'}
            </p>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              type="number"
              value={stakeUsd}
              onChange={(e) => onStakeChange(e.target.value)}
              placeholder="$100"
              min="1"
              className="h-10 text-center"
            />
          </div>
          <div className="w-24 text-center">
            <input
              type="range"
              min="1"
              max={maxLeverage}
              value={leverage}
              onChange={(e) => onLeverageChange(parseInt(e.target.value))}
              className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none"
            />
            <span className="text-xs text-white/60">{leverage}x</span>
          </div>
          <Button
            onClick={onExecute}
            disabled={!canExecute}
            className="h-10 px-4 text-sm font-semibold"
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
        </div>

        {/* Summary Row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">
            Notional: <span className={notional >= 10 ? 'text-[#E8FF00]' : 'text-red-400'}>${notional.toFixed(0)}</span>
          </span>
          <span className={hasInsufficientBalance ? 'text-red-400' : 'text-white/50'}>
            Available: ${availableBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Trade Preview - Mini VS Battle Card
 */
function TradePreview({
  suggestion,
  onClear,
  compact = false,
}: {
  suggestion: NarrativeSuggestion;
  onClear: () => void;
  compact?: boolean;
}) {
  const longAssets = suggestion.longAssets.filter(a => a.weight > 0);
  const shortAssets = suggestion.shortAssets.filter(a => a.weight > 0);

  return (
    <div className={`relative rounded-xl bg-white/[0.03] border border-white/[0.1] ${compact ? 'p-3' : 'p-4'}`}>
      {/* Clear Button */}
      <button
        onClick={onClear}
        className="absolute top-2 right-2 p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>

      {/* VS Battle */}
      <div className="flex items-center gap-3 pr-6">
        {/* Longs */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpIcon className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Long</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {longAssets.slice(0, 3).map((asset) => (
              <span
                key={asset.asset}
                className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400"
              >
                {asset.asset}
              </span>
            ))}
            {longAssets.length > 3 && (
              <span className="text-xs text-white/40">+{longAssets.length - 3}</span>
            )}
          </div>
        </div>

        {/* VS */}
        <div className="text-xs font-bold text-white/30">VS</div>

        {/* Shorts */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1 justify-end">
            <span className="text-xs text-red-400 font-medium">Short</span>
            <ArrowDownIcon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {shortAssets.slice(0, 3).map((asset) => (
              <span
                key={asset.asset}
                className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400"
              >
                {asset.asset}
              </span>
            ))}
            {shortAssets.length > 3 && (
              <span className="text-xs text-white/40">+{shortAssets.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Confidence */}
      {suggestion.confidence !== undefined && !compact && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Confidence</span>
            <span className={`font-medium ${
              suggestion.confidence >= 0.7 ? 'text-green-400' :
              suggestion.confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {(suggestion.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
