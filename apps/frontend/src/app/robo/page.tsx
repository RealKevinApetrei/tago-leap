'use client';

import { useState, useEffect } from 'react';
import { SwapPanel } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { saltApi } from '@/lib/api';

interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  narrativeId: string;
  defaultParams: Record<string, any>;
}

export default function RoboPage() {
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<any>(null);

  // Form state
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [maxLeverage, setMaxLeverage] = useState('2');
  const [maxDailyNotional, setMaxDailyNotional] = useState('10000');
  const [maxDrawdown, setMaxDrawdown] = useState('10');

  // Load strategies on mount
  useEffect(() => {
    async function loadStrategies() {
      try {
        const data = await saltApi.getStrategies();
        setStrategies(data);
        if (data.length > 0) {
          setSelectedStrategy(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load strategies:', err);
      }
    }
    loadStrategies();
  }, []);

  const strategy = strategies.find((s) => s.id === selectedStrategy);

  const handleCreateAccount = async () => {
    if (!walletAddress) {
      alert('Please enter your wallet address');
      return;
    }

    setLoading(true);
    try {
      const acc = await saltApi.createAccount({ userWalletAddress: walletAddress });
      setAccount(acc);
    } catch (err) {
      console.error('Failed to create account:', err);
      alert('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPolicy = async () => {
    if (!account) return;

    setLoading(true);
    try {
      await saltApi.setPolicy(account.id, {
        maxLeverage: parseFloat(maxLeverage),
        maxDailyNotionalUsd: parseFloat(maxDailyNotional),
        maxDrawdownPct: parseFloat(maxDrawdown),
        allowedPairs: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      });
      alert('Policy updated successfully!');
    } catch (err) {
      console.error('Failed to set policy:', err);
      alert('Failed to set policy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableStrategy = async () => {
    if (!account || !selectedStrategy) return;

    setLoading(true);
    try {
      await saltApi.addStrategy(account.id, {
        strategyId: selectedStrategy,
        active: true,
      });
      alert('Strategy enabled successfully!');
    } catch (err) {
      console.error('Failed to enable strategy:', err);
      alert('Failed to enable strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Setup */}
      {!account ? (
        <SwapPanel title="Create Robo Account" subtitle="Set up automated trading">
          <Input
            label="Wallet Address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
          />

          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <h3 className="font-light text-white mb-2">
              What is a <span className="italic text-tago-yellow-400">Robo Account</span>?
            </h3>
            <p className="text-sm text-white/60 font-light leading-relaxed">
              A Salt robo account automatically executes trading strategies on your behalf
              based on predefined rules and risk parameters.
            </p>
          </div>

          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleCreateAccount}
            loading={loading}
            disabled={!walletAddress}
          >
            Create Robo Account
          </Button>
        </SwapPanel>
      ) : (
        <>
          {/* Account Info */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/40 font-light">Salt Account</span>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-xs text-white/40 font-mono truncate">
                {account.salt_account_address}
              </p>
            </div>
          </Card>

          {/* Policy Configuration */}
          <SwapPanel title="Risk Policy" subtitle="Configure trading limits">
            <Input
              label="Max Leverage"
              type="number"
              value={maxLeverage}
              onChange={(e) => setMaxLeverage(e.target.value)}
              helperText="Maximum leverage for any position (1-10)"
            />

            <Input
              label="Max Daily Notional (USD)"
              type="number"
              value={maxDailyNotional}
              onChange={(e) => setMaxDailyNotional(e.target.value)}
              helperText="Maximum total position size per day"
            />

            <Input
              label="Max Drawdown (%)"
              type="number"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(e.target.value)}
              helperText="Stop trading if losses exceed this percentage"
            />

            <Button
              variant="ghost"
              fullWidth
              onClick={handleSetPolicy}
              loading={loading}
            >
              Update Policy
            </Button>
          </SwapPanel>

          {/* Strategy Selection */}
          <SwapPanel title="Enable Strategy" subtitle="Choose your trading algorithm">
            <Select
              label="Strategy"
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              options={strategies.map((s) => ({
                label: s.name,
                value: s.id,
              }))}
              placeholder="Select strategy"
            />

            {strategy && (
              <Card variant="solid">
                <div className="p-4">
                  <p className="text-sm text-white/60 font-light mb-4">{strategy.description}</p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40 font-light">Entry Threshold</span>
                      <span className="text-white font-light">{strategy.defaultParams.entryThreshold * 100}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40 font-light">Position Size</span>
                      <span className="text-white font-light">${strategy.defaultParams.positionSizeUsd}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40 font-light">Max Positions</span>
                      <span className="text-white font-light">{strategy.defaultParams.maxPositions}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Button
              variant="yellow"
              fullWidth
              size="lg"
              onClick={handleEnableStrategy}
              loading={loading}
              disabled={!selectedStrategy}
            >
              Enable Robo Manager
            </Button>
          </SwapPanel>
        </>
      )}
    </div>
  );
}
