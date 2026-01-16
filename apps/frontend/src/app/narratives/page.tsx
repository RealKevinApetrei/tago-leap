'use client';

import { useState, useEffect } from 'react';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { pearApi } from '@/lib/api';

interface Narrative {
  id: string;
  name: string;
  description: string;
  longAsset: string;
  shortAsset: string;
}

export default function NarrativesPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedNarrative, setSelectedNarrative] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [stakeUsd, setStakeUsd] = useState('100');
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  // Load narratives on mount
  useEffect(() => {
    async function loadNarratives() {
      setLoading(true);
      try {
        const data = await pearApi.getNarratives();
        setNarratives(data);
        if (data.length > 0) {
          setSelectedNarrative(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load narratives:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNarratives();
  }, []);

  const narrative = narratives.find((n) => n.id === selectedNarrative);

  const handleExecute = async () => {
    if (!walletAddress || !selectedNarrative || !stakeUsd) {
      alert('Please fill in all fields');
      return;
    }

    setExecuting(true);
    try {
      const trade = await pearApi.executeBet({
        userWalletAddress: walletAddress,
        narrativeId: selectedNarrative,
        direction,
        stakeUsd: parseFloat(stakeUsd),
        riskProfile,
        mode: 'paper',
      });
      setResult(trade);
    } catch (err) {
      console.error('Failed to execute bet:', err);
      alert('Failed to execute bet. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SwapPanel title="Place Narrative Bet" subtitle="Trade market themes with leverage">
        {/* Wallet Address */}
        <Input
          label="Wallet Address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x..."
        />

        {/* Narrative Selection */}
        <Select
          label="Narrative"
          value={selectedNarrative}
          onChange={(e) => setSelectedNarrative(e.target.value)}
          options={narratives.map((n) => ({
            label: n.name,
            value: n.id,
          }))}
          placeholder="Select narrative"
        />

        {/* Narrative Description */}
        {narrative && (
          <Card variant="solid">
            <div className="p-4">
              <p className="text-sm text-white/60 font-light mb-3">{narrative.description}</p>
              <div className="flex gap-2">
                <Badge variant="success">Long: {narrative.longAsset}</Badge>
                <Badge variant="error">Short: {narrative.shortAsset}</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Direction */}
        <div className="space-y-2">
          <label className="block text-sm font-light text-white/70">
            Direction
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setDirection('long')}
              className={`flex-1 py-3 rounded-xl font-light tracking-wide transition-all ${
                direction === 'long'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:bg-white/5 hover:border-white/15'
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setDirection('short')}
              className={`flex-1 py-3 rounded-xl font-light tracking-wide transition-all ${
                direction === 'short'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:bg-white/5 hover:border-white/15'
              }`}
            >
              Short
            </button>
          </div>
        </div>

        {/* Stake Amount */}
        <Input
          label="Stake (USD)"
          type="number"
          value={stakeUsd}
          onChange={(e) => setStakeUsd(e.target.value)}
          placeholder="100"
        />

        {/* Risk Profile */}
        <Select
          label="Risk Profile"
          value={riskProfile}
          onChange={(e) => setRiskProfile(e.target.value as any)}
          options={[
            { label: 'Conservative (1x)', value: 'conservative' },
            { label: 'Moderate (2x)', value: 'moderate' },
            { label: 'Aggressive (5x)', value: 'aggressive' },
          ]}
        />

        {/* Trade Summary */}
        {narrative && stakeUsd && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Notional Exposure</span>
              <span className="text-white font-light">
                ${(parseFloat(stakeUsd) * (riskProfile === 'aggressive' ? 5 : riskProfile === 'moderate' ? 2 : 1)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Mode</span>
              <Badge variant="warning">Paper Trading</Badge>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <Button
          variant="yellow"
          fullWidth
          size="lg"
          onClick={handleExecute}
          loading={executing}
          disabled={!walletAddress || !selectedNarrative || !stakeUsd}
        >
          Place Bet
        </Button>

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
