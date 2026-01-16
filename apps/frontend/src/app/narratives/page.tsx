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

  const confidenceColor = suggestion
    ? suggestion.confidence >= 0.7
      ? 'text-green-400'
      : suggestion.confidence >= 0.4
      ? 'text-yellow-400'
      : 'text-red-400'
    : '';

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

        {/* AI Suggestion */}
        {suggestion && (
          <>
            <Card variant="default">
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">{suggestion.narrative}</h3>
                    <p className="text-sm text-white/60 font-light mt-1">{suggestion.rationale}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={suggestion.confidence >= 0.7 ? 'success' : suggestion.confidence >= 0.4 ? 'warning' : 'error'}>
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>

                {/* Warnings */}
                {suggestion.warnings && suggestion.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400 font-light">
                      {suggestion.warnings.join('. ')}
                    </p>
                  </div>
                )}

                {/* Long Assets */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Long Positions
                  </h4>
                  {suggestion.longAssets.map((asset, i) => (
                    <div key={asset.asset} className="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{asset.asset}</p>
                        <p className="text-xs text-white/50 font-light">{asset.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(asset.weight * 100)}
                          onChange={(e) => updateAssetWeight('long', i, parseInt(e.target.value) / 100)}
                          className="w-20 accent-green-400"
                        />
                        <span className="text-sm text-white/70 w-12 text-right">
                          {Math.round(asset.weight * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Short Assets */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    Short Positions
                  </h4>
                  {suggestion.shortAssets.map((asset, i) => (
                    <div key={asset.asset} className="flex items-center gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{asset.asset}</p>
                        <p className="text-xs text-white/50 font-light">{asset.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(asset.weight * 100)}
                          onChange={(e) => updateAssetWeight('short', i, parseInt(e.target.value) / 100)}
                          className="w-20 accent-red-400"
                        />
                        <span className="text-sm text-white/70 w-12 text-right">
                          {Math.round(asset.weight * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

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
