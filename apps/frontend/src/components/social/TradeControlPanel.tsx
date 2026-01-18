'use client';

import { useState, useRef, useEffect } from 'react';
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
  // Setup state - replaces X connection
  isSetupComplete?: boolean;
  isRunningSetup?: boolean;
  onConnectToTrade?: () => void;
  /** True if only X connection is needed (setup steps 1-5 already complete) */
  isXConnectionOnly?: boolean;
  // Asset weight management
  onUpdateWeight?: (side: 'long' | 'short', index: number, weight: number) => void;
  onRemoveAsset?: (side: 'long' | 'short', asset: string) => void;
  // Risk management
  todayNotional?: number;
  maxDailyNotional?: number;
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
  isSetupComplete = false,
  isRunningSetup = false,
  onConnectToTrade,
  isXConnectionOnly = false,
  onUpdateWeight,
  onRemoveAsset,
  todayNotional = 0,
  maxDailyNotional = 100000,
}: TradeControlPanelProps) {
  const stake = parseFloat(stakeUsd) || 0;
  const notional = stake * leverage;
  const hasInsufficientBalance = stake > availableBalance;

  // Calculate number of positions and minimum required notional
  const numLongPositions = suggestion?.longAssets.filter(a => a.weight > 0).length || 0;
  const numShortPositions = suggestion?.shortAssets.filter(a => a.weight > 0).length || 0;
  const totalPositions = numLongPositions + numShortPositions;
  const minNotionalPerPosition = 10; // Hyperliquid minimum
  const minRequiredNotional = totalPositions * minNotionalPerPosition;

  // Check if each position gets at least $10
  const notionalPerPosition = totalPositions > 0 ? notional / totalPositions : 0;
  const isMinNotionalPerPositionMet = totalPositions === 0 || notionalPerPosition >= minNotionalPerPosition;

  // Legacy check for total notional (at least $10 total)
  const isMinNotionalMet = notional >= 10;

  // Determine the blocking reason
  const getBlockReason = (): { blocked: boolean; message: string } | null => {
    if (!suggestion) return null;
    if (hasInsufficientBalance) {
      return {
        blocked: true,
        message: `Insufficient balance. You have $${availableBalance.toFixed(2)} available but need $${stake.toFixed(2)}`
      };
    }
    if (!isMinNotionalPerPositionMet) {
      return {
        blocked: true,
        message: `Min $${minRequiredNotional} notional needed (${totalPositions} positions × $${minNotionalPerPosition} each). Current: $${notional.toFixed(0)}`
      };
    }
    if (!isMinNotionalMet) {
      return {
        blocked: true,
        message: `Minimum notional is $10. Current: $${notional.toFixed(0)}`
      };
    }
    return null;
  };

  const blockReason = getBlockReason();
  const canExecute = suggestion && !blockReason && !isExecuting && isSetupComplete;

  // Risk level calculation
  const dailyUsagePercent = maxDailyNotional > 0 ? (todayNotional / maxDailyNotional) * 100 : 0;
  const riskLevel = dailyUsagePercent >= 90 ? 'high' : dailyUsagePercent >= 70 ? 'medium' : 'low';

  return (
    <div className="p-4 md:p-6">
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-center gap-6">
        {/* Trade Preview (Left) */}
        <div className="flex-shrink-0 w-72">
          {suggestion ? (
            <TradePreview
              suggestion={suggestion}
              onClear={onClear}
              onUpdateWeight={onUpdateWeight}
              onRemoveAsset={onRemoveAsset}
            />
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
              <p className={`text-lg font-semibold ${accountHealth < 50 ? 'text-red-400' : accountHealth < 80 ? 'text-yellow-400' : 'text-white/90'}`}>
                {accountHealth.toFixed(0)}%
              </p>
            </div>
          )}
          {/* Daily Notional Progress */}
          {maxDailyNotional > 0 && (
            <div className="min-w-[100px]">
              <span className="text-xs text-white/50">Daily Limit</span>
              <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    riskLevel === 'high' ? 'bg-red-500' :
                    riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-0.5 ${
                riskLevel === 'high' ? 'text-red-400' :
                riskLevel === 'medium' ? 'text-yellow-400' : 'text-white/50'
              }`}>
                {dailyUsagePercent.toFixed(0)}% used
              </p>
            </div>
          )}
        </div>

        {/* Connect to Trade or Execute Button */}
        <div className="flex flex-col items-end gap-2">
          {/* Error message when blocked */}
          {blockReason && isSetupComplete && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <WarningIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400">{blockReason.message}</span>
            </div>
          )}

          {!isSetupComplete ? (
            <Button
              onClick={onConnectToTrade}
              disabled={isRunningSetup}
              className="h-12 px-8 text-base font-semibold rounded-xl bg-[#E8FF00] text-black hover:bg-[#d4eb00] transition-all"
            >
              {isRunningSetup ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  {isXConnectionOnly ? 'Connecting...' : 'Setting up...'}
                </span>
              ) : isXConnectionOnly ? (
                <span className="flex items-center gap-2">
                  Connect to
                  <XLogoIcon className="w-5 h-5" />
                </span>
              ) : (
                'Connect to Trade'
              )}
            </Button>
          ) : (
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
          )}
        </div>
      </div>

      {/* Mobile: Stacked Layout */}
      <div className="md:hidden space-y-4">
        {/* Trade Preview */}
        {suggestion ? (
          <TradePreview
            suggestion={suggestion}
            onClear={onClear}
            onUpdateWeight={onUpdateWeight}
            onRemoveAsset={onRemoveAsset}
            compact
          />
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
          {!isSetupComplete ? (
            <Button
              onClick={onConnectToTrade}
              disabled={isRunningSetup}
              className="h-10 px-4 text-sm font-semibold bg-[#E8FF00] text-black hover:bg-[#d4eb00]"
            >
              {isRunningSetup ? '...' : isXConnectionOnly ? (
                <XLogoIcon className="w-4 h-4" />
              ) : (
                'Connect'
              )}
            </Button>
          ) : (
            <Button
              onClick={onExecute}
              disabled={!canExecute}
              className="h-10 px-4 text-sm font-semibold"
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          )}
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

        {/* Mobile Error Message */}
        {blockReason && isSetupComplete && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <WarningIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400">{blockReason.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Editable Asset Badge - Shows weight, allows editing and removal
 */
function AssetBadge({
  asset,
  weight,
  side,
  index,
  onUpdateWeight,
  onRemove,
}: {
  asset: string;
  weight: number;
  side: 'long' | 'short';
  index: number;
  onUpdateWeight?: (side: 'long' | 'short', index: number, weight: number) => void;
  onRemove?: (side: 'long' | 'short', asset: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editWeight, setEditWeight] = useState((weight * 100).toFixed(0));
  const popoverRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const isLong = side === 'long';

  // Handle click outside to close popover
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        badgeRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !badgeRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    // Add a small delay to prevent immediate close from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  // Reset edit weight when weight prop changes
  useEffect(() => {
    setEditWeight((weight * 100).toFixed(0));
  }, [weight]);

  const handleWeightChange = () => {
    const newWeight = parseFloat(editWeight) / 100;
    if (!isNaN(newWeight) && newWeight > 0 && newWeight <= 1 && onUpdateWeight) {
      onUpdateWeight(side, index, newWeight);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditWeight((weight * 100).toFixed(0));
    setIsEditing(false);
  };

  return (
    <div className="group relative">
      <div
        ref={badgeRef}
        className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded cursor-pointer transition-all ${
          isLong
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
        onClick={() => setIsEditing(true)}
      >
        <span>{asset}</span>
        <span className="text-[10px] opacity-70">{(weight * 100).toFixed(0)}%</span>
      </div>

      {/* Remove button on hover */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(side, asset);
          }}
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
            isLong ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
          }`}
        >
          <XIcon className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Weight edit popover */}
      {isEditing && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg bg-black/90 border border-white/20 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleWeightChange();
                if (e.key === 'Escape') handleCancel();
              }}
              className="w-16 px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white"
              min="1"
              max="100"
              autoFocus
            />
            <span className="text-xs text-white/50">%</span>
            <button
              onClick={handleWeightChange}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60"
              title="Apply"
            >
              <CheckIcon className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60"
              title="Cancel"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Trade Preview - Mini VS Battle Card with editable weights
 */
function TradePreview({
  suggestion,
  onClear,
  onUpdateWeight,
  onRemoveAsset,
  compact = false,
}: {
  suggestion: NarrativeSuggestion;
  onClear: () => void;
  onUpdateWeight?: (side: 'long' | 'short', index: number, weight: number) => void;
  onRemoveAsset?: (side: 'long' | 'short', asset: string) => void;
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
          <div className="flex flex-wrap gap-1.5">
            {longAssets.slice(0, compact ? 2 : 4).map((asset, idx) => (
              <AssetBadge
                key={asset.asset}
                asset={asset.asset}
                weight={asset.weight}
                side="long"
                index={idx}
                onUpdateWeight={onUpdateWeight}
                onRemove={onRemoveAsset}
              />
            ))}
            {longAssets.length > (compact ? 2 : 4) && (
              <span className="text-xs text-white/40 self-center">+{longAssets.length - (compact ? 2 : 4)}</span>
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
          <div className="flex flex-wrap gap-1.5 justify-end">
            {shortAssets.slice(0, compact ? 2 : 4).map((asset, idx) => (
              <AssetBadge
                key={asset.asset}
                asset={asset.asset}
                weight={asset.weight}
                side="short"
                index={idx}
                onUpdateWeight={onUpdateWeight}
                onRemove={onRemoveAsset}
              />
            ))}
            {shortAssets.length > (compact ? 2 : 4) && (
              <span className="text-xs text-white/40 self-center">+{shortAssets.length - (compact ? 2 : 4)}</span>
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
