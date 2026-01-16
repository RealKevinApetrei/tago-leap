'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
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
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [account, setAccount] = useState<any>(null);

  // Form state
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

  // Auto-create/load account when wallet connects
  useEffect(() => {
    async function initializeAccount() {
      if (!address || account) return;

      setInitializing(true);
      try {
        const response = await saltApi.createAccount({ userWalletAddress: address });
        setAccount(response.account || response);
        console.log('Salt account initialized:', response);
      } catch (err) {
        console.error('Failed to initialize account:', err);
      } finally {
        setInitializing(false);
      }
    }

    if (isConnected && address) {
      initializeAccount();
    }
  }, [address, isConnected, account]);

  // Reset account when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setAccount(null);
    }
  }, [isConnected]);

  const strategy = strategies.find((s) => s.id === selectedStrategy);

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

  // Not connected - show connect prompt
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SwapPanel title="Robo Manager" subtitle="Automated trading strategies">
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <circle cx="16" cy="13" r="1.5" fill="currentColor" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-white/60 font-light">
                Connect your wallet to set up automated trading strategies
              </p>
            </div>
            <Button
              variant="yellow"
              size="lg"
              onClick={openConnectModal}
            >
              Connect Wallet
            </Button>
          </div>
        </SwapPanel>
      </div>
    );
  }

  // Loading account
  if (initializing) {
    return (
      <div className="space-y-6">
        <SwapPanel title="Robo Manager" subtitle="Setting up your account">
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-2 border-tago-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/60 font-light">Initializing your robo account...</p>
          </div>
        </SwapPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/40 font-light">Connected Wallet</span>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-sm text-white font-mono break-all">{address}</p>
          {account?.salt_account_address && (
            <>
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className="text-xs text-white/40 font-light">Salt Account Address</span>
                <p className="text-sm text-tago-yellow-400 font-mono break-all mt-1">
                  {account.salt_account_address}
                </p>
              </div>
            </>
          )}
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
          disabled={!account}
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
          disabled={!selectedStrategy || !account}
        >
          Enable Robo Manager
        </Button>
      </SwapPanel>
    </div>
  );
}
