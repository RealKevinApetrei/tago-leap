'use client';

import { useState } from 'react';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { pearApi, NarrativeSuggestion } from '@/lib/api';

export default function NarrativesPage() {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [walletAddress, setWalletAddress] = useState('');
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [stakeUsd, setStakeUsd] = useState('100');
  const [leverage, setLeverage] = useState(3);

  const handleGetSuggestion = async () => {
    if (!prompt.trim()) {
      setError('Please enter your trading idea');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const data = await pearApi.suggestNarrative(prompt);
      setSuggestion(data);
      setStakeUsd(data.suggestedStakeUsd?.toString() || '100');
      setLeverage(data.suggestedLeverage || 3);
    } catch (err) {
      console.error('Failed to get suggestion:', err);
      setError('Failed to generate suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateAssetWeight = (
    side: 'long' | 'short',
    index: number,
    newWeight: number
  ) => {
    if (!suggestion) return;

    const assets = side === 'long' ? [...suggestion.longAssets] : [...suggestion.shortAssets];
    assets[index] = { ...assets[index], weight: newWeight };

    setSuggestion({
      ...suggestion,
      [side === 'long' ? 'longAssets' : 'shortAssets']: assets,
    });
  };

  const handleExecute = async () => {
    if (!walletAddress || !suggestion) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(stakeUsd) < 1) {
      setError('Minimum stake is $1');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const trade = await pearApi.executeTrade({
        userWalletAddress: walletAddress,
        longAssets: suggestion.longAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        shortAssets: suggestion.shortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
        stakeUsd: parseFloat(stakeUsd),
        leverage,
      });
      setResult(trade);
    } catch (err: any) {
      console.error('Failed to execute trade:', err);
      setError(err.message || 'Failed to execute trade. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SwapPanel title="AI Trade Builder" subtitle="Describe your thesis, get a pair trade">
        {/* Wallet Address */}
        <Input
          label="Wallet Address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x..."
        />

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="block text-sm font-light text-white/70">
            Your Trading Idea
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., I think AI tokens will outperform ETH in the coming weeks..."
            className="w-full h-24 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-light placeholder:text-white/30 focus:outline-none focus:border-tago-yellow-400/50 focus:ring-1 focus:ring-tago-yellow-400/20 resize-none transition-all"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/40 font-light">
              Examples: "SOL ecosystem is heating up", "DeFi will recover vs majors"
            </p>
            <span className="text-xs text-white/40">{prompt.length}/1000</span>
          </div>
        </div>

        {/* Get Suggestion Button */}
        <Button
          variant="ghost"
          fullWidth
          onClick={handleGetSuggestion}
          loading={loading}
          disabled={!prompt.trim()}
        >
          Get AI Suggestion
        </Button>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400 font-light">{error}</p>
          </div>
        )}

        {/* AI Suggestion - Abstract Visual */}
        {suggestion && (
          <>
            {/* Hero Card - VS Battle Style */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] p-6">
              {/* Background glow effects */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />

              {/* Main VS Display */}
              <div className="relative flex items-center justify-between gap-4">
                {/* Long Side */}
                <div className="flex-1 text-center">
                  <div className="text-xs uppercase tracking-widest text-green-400/60 mb-2">Long</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestion.longAssets.map((asset) => (
                      <span
                        key={asset.asset}
                        className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium"
                      >
                        {asset.asset}
                      </span>
                    ))}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center px-4">
                  <div className="w-px h-8 bg-gradient-to-b from-green-500/50 to-transparent" />
                  <span className="text-white/20 text-xs font-bold my-2">VS</span>
                  <div className="w-px h-8 bg-gradient-to-t from-red-500/50 to-transparent" />
                </div>

                {/* Short Side */}
                <div className="flex-1 text-center">
                  <div className="text-xs uppercase tracking-widest text-red-400/60 mb-2">Short</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestion.shortAssets.map((asset) => (
                      <span
                        key={asset.asset}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium"
                      >
                        {asset.asset}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      suggestion.confidence >= 0.7
                        ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                        : suggestion.confidence >= 0.4
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                        : 'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                    style={{ width: `${suggestion.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-white/40 tabular-nums">{Math.round(suggestion.confidence * 100)}%</span>
              </div>

              {/* Minimal Warning Indicator */}
              {suggestion.warnings && suggestion.warnings.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-yellow-400/60">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider">volatile pair</span>
                </div>
              )}
            </div>

            {/* Rationale callout - below card with arrow pointing up */}
            <details className="group/rationale relative">
              {/* Arrow pointing up */}
              <div className="absolute -top-2 right-8">
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/10" />
              </div>
              {/* Summary - always visible */}
              <summary className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 cursor-pointer list-none hover:from-white/[0.06] transition-all">
                <div className="w-6 h-6 rounded-full bg-tago-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-tago-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </div>
                <span className="text-xs text-white/50 flex-1">{suggestion.narrative}</span>
                <svg className="w-4 h-4 text-white/30 transition-transform group-open/rationale:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              {/* Full rationale - shown on expand */}
              <div className="mt-2 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <p className="text-sm text-white/60 leading-relaxed">{suggestion.rationale}</p>
              </div>
            </details>

            {/* Expandable Details */}
            <details className="group">
              <summary className="flex items-center gap-2 text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                adjust weights
              </summary>
              <div className="mt-3 space-y-2">
                {suggestion.longAssets.map((asset, i) => (
                  <div key={asset.asset} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-green-400/70">{asset.asset}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(asset.weight * 100)}
                      onChange={(e) => updateAssetWeight('long', i, parseInt(e.target.value) / 100)}
                      className="flex-1 accent-green-400 h-1"
                    />
                    <span className="w-10 text-right text-white/40 tabular-nums">{Math.round(asset.weight * 100)}%</span>
                  </div>
                ))}
                {suggestion.shortAssets.map((asset, i) => (
                  <div key={asset.asset} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-red-400/70">{asset.asset}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(asset.weight * 100)}
                      onChange={(e) => updateAssetWeight('short', i, parseInt(e.target.value) / 100)}
                      className="flex-1 accent-red-400 h-1"
                    />
                    <span className="w-10 text-right text-white/40 tabular-nums">{Math.round(asset.weight * 100)}%</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Trade Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Stake (USD)"
                type="number"
                value={stakeUsd}
                onChange={(e) => setStakeUsd(e.target.value)}
                placeholder="100"
              />
              <div className="space-y-2">
                <label className="block text-sm font-light text-white/70">
                  Leverage: {leverage}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full accent-tago-yellow-400"
                />
                <div className="flex justify-between text-xs text-white/40">
                  <span>1x</span>
                  <span>20x</span>
                </div>
              </div>
            </div>

            {/* Trade Summary */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-light">Stake</span>
                <span className="text-white font-light">${parseFloat(stakeUsd || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-light">Leverage</span>
                <span className="text-white font-light">{leverage}x</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/[0.08] pt-3">
                <span className="text-white/40 font-light">Notional Exposure</span>
                <span className="text-tago-yellow-400 font-medium">
                  ${(parseFloat(stakeUsd || '0') * leverage).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Execute Button */}
            <Button
              variant="yellow"
              fullWidth
              size="lg"
              onClick={handleExecute}
              loading={executing}
              disabled={!walletAddress || !suggestion}
            >
              Execute Trade
            </Button>
          </>
        )}

        {/* Result */}
        {result && (
          <Card variant="solid" className="bg-green-500/10 border-green-500/20">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">Trade Executed</Badge>
              </div>
              <p className="text-sm text-white/60 font-light">
                Trade ID: {result.id}
              </p>
              <p className="text-sm text-white/60 font-light">
                Status: {result.status}
              </p>
            </div>
          </Card>
        )}
      </SwapPanel>
    </div>
  );
}
