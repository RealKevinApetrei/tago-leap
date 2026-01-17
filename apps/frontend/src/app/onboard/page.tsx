'use client';

import { useState, useEffect, useCallback } from 'react';
import { SwapPanel, SwapField, SwapDivider } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { lifiApi } from '@/lib/api';

// HyperEVM USDC address
const HYPEREVM_USDC = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';

interface ChainOption {
  chainId: number;
  chainName: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

interface SaltWallet {
  userWalletAddress: string;
  saltWalletAddress: string;
  exists: boolean;
}

type FlowStatus = 'idle' | 'quoting' | 'signing' | 'bridging' | 'completed' | 'failed';

export default function OnboardPage() {
  const [options, setOptions] = useState<ChainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('idle');
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Salt wallet state
  const [saltWallet, setSaltWallet] = useState<SaltWallet | null>(null);
  const [saltLoading, setSaltLoading] = useState(false);

  // Form state
  const [fromChain, setFromChain] = useState('');
  const [fromToken, setFromToken] = useState('');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  // Load options on mount
  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const data = await lifiApi.getOptions();
        setOptions(data);
        if (data.length > 0) {
          setFromChain(String(data[0].chainId));
          if (data[0].tokens.length > 0) {
            setFromToken(data[0].tokens[0].address);
          }
        }
      } catch (err) {
        console.error('Failed to load options:', err);
        setError('Failed to load supported chains');
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  // Check salt wallet when address changes (debounced)
  const checkSaltWallet = useCallback(async (address: string) => {
    if (!address || address.length < 42) {
      setSaltWallet(null);
      return;
    }

    setSaltLoading(true);
    setError(null);
    try {
      const data = await lifiApi.getSaltWallet(address);
      setSaltWallet(data);
    } catch (err) {
      console.error('Failed to check salt wallet:', err);
      setSaltWallet(null);
    } finally {
      setSaltLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkSaltWallet(walletAddress);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [walletAddress, checkSaltWallet]);

  const selectedChain = options.find((o) => String(o.chainId) === fromChain);
  const selectedToken = selectedChain?.tokens.find((t) => t.address === fromToken);

  // Parse amount to smallest unit
  const parseAmount = (value: string, decimals: number): string => {
    if (!value) return '0';
    const parts = value.split('.');
    const wholePart = parts[0] || '0';
    const decPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    return BigInt(wholePart + decPart).toString();
  };

  const handleGetQuote = async () => {
    if (!walletAddress || !fromChain || !fromToken || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    setFlowStatus('quoting');
    setError(null);
    setQuote(null);

    try {
      const amountInSmallestUnit = parseAmount(amount, selectedToken.decimals);

      const result = await lifiApi.getQuote({
        userWalletAddress: walletAddress,
        fromChainId: parseInt(fromChain),
        fromTokenAddress: fromToken,
        amount: amountInSmallestUnit,
        toTokenAddress: HYPEREVM_USDC,
        depositToSaltWallet: true,
      });
      setQuote(result);
      setFlowStatus('idle');
    } catch (err) {
      console.error('Failed to get quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote. Please try again.');
      setFlowStatus('failed');
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    setFlowStatus('signing');
    setError(null);

    try {
      // In a real implementation, you would:
      // 1. Get the transaction data from the quote
      // 2. Sign and send the transaction using the user's wallet
      // 3. Track the transaction

      // For now, simulate the flow
      setFlowStatus('bridging');

      // Track the onboarding (would include real tx hash)
      await lifiApi.trackOnboarding({
        flowId: quote.id,
        txHashes: ['0x...'], // Would be real tx hash
      });

      // After bridge completes, initiate deposit
      await lifiApi.deposit({ flowId: quote.id });

      setFlowStatus('completed');

      // Reset after success
      setTimeout(() => {
        setQuote(null);
        setAmount('');
        setFlowStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Failed to execute swap:', err);
      setError(err instanceof Error ? err.message : 'Swap failed. Please try again.');
      setFlowStatus('failed');
    }
  };

  const getStatusBadge = () => {
    switch (flowStatus) {
      case 'quoting':
        return <Badge variant="yellow">Getting Quote...</Badge>;
      case 'signing':
        return <Badge variant="yellow">Waiting for Signature...</Badge>;
      case 'bridging':
        return <Badge variant="yellow">Bridging...</Badge>;
      case 'completed':
        return <Badge variant="success">Completed!</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return quote ? <Badge variant="success">{quote.status}</Badge> : null;
    }
  };

  const isLoading = flowStatus === 'quoting' || flowStatus === 'signing' || flowStatus === 'bridging';

  return (
    <div className="space-y-6">
      <SwapPanel title="Deposit to Hyperliquid" subtitle="Bridge assets from any chain">
        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="block text-sm font-light text-white/70">
            Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/40 font-light transition-all duration-200 focus:border-tago-yellow-400 focus:ring-2 focus:ring-tago-yellow-400/15 hover:border-white/15"
          />
        </div>

        {/* Salt Wallet Display */}
        {saltLoading && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <div className="flex items-center gap-2 text-white/40">
              <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-tago-yellow-400 rounded-full" />
              <span className="text-sm font-light">Checking Salt account...</span>
            </div>
          </div>
        )}

        {saltWallet && !saltLoading && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-tago-yellow-400/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/40 font-light">Salt Account</span>
              <Badge variant={saltWallet.exists ? 'success' : 'yellow'}>
                {saltWallet.exists ? 'Active' : 'New'}
              </Badge>
            </div>
            <div className="text-sm text-white/70 font-mono break-all">
              {saltWallet.saltWalletAddress}
            </div>
            <p className="text-xs text-white/40 mt-2 font-light">
              Funds will be deposited to this policy-controlled account
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* From Chain */}
        <Select
          label="From Chain"
          value={fromChain}
          onChange={(e) => {
            setFromChain(e.target.value);
            const chain = options.find((o) => String(o.chainId) === e.target.value);
            if (chain?.tokens.length) {
              setFromToken(chain.tokens[0].address);
            }
            setQuote(null);
          }}
          options={options.map((o) => ({
            label: o.chainName,
            value: String(o.chainId),
          }))}
          placeholder={loading ? 'Loading chains...' : 'Select chain'}
          disabled={loading}
        />

        {/* Supported Chains Info */}
        {options.length > 0 && (
          <div className="text-xs text-white/40 font-light">
            {options.length} chains supported via LI.FI
          </div>
        )}

        {/* From Token */}
        {selectedChain && (
          <Select
            label="Token"
            value={fromToken}
            onChange={(e) => {
              setFromToken(e.target.value);
              setQuote(null);
            }}
            options={selectedChain.tokens.map((t) => ({
              label: t.symbol,
              value: t.address,
            }))}
            placeholder="Select token"
          />
        )}

        {/* Amount */}
        <SwapField
          label="Amount"
          value={amount}
          onChange={(val) => {
            setAmount(val);
            setQuote(null);
          }}
          token={selectedToken ? { symbol: selectedToken.symbol } : undefined}
        />

        <SwapDivider />

        {/* To (HyperEVM) */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/40 font-light">Receive on HyperEVM</span>
            <Badge variant="yellow">HyperEVM</Badge>
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {quote?.recommended?.toAmountFormatted || amount || '0.0'} USDC
          </div>
          {quote?.recommended?.toAmountMin && (
            <div className="text-xs text-white/40 mt-1">
              Min: {quote.recommended.toAmountMin} USDC (after slippage)
            </div>
          )}
        </div>

        {/* Quote Details */}
        {quote && quote.recommended && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            {/* Route Info */}
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Route</span>
              <span className="text-white font-light">
                {quote.recommended.steps?.map((s: any) => s.toolName).join(' → ') || 'Direct'}
              </span>
            </div>

            {/* ETA */}
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Estimated Time</span>
              <span className="text-white font-light">
                {quote.recommended.estimatedDurationFormatted || '~3 seconds'}
              </span>
            </div>

            {/* Gas Cost */}
            {quote.recommended.fees?.gasCostUsd && (
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-light">Gas Cost</span>
                <span className="text-white font-light">${quote.recommended.fees.gasCostUsd}</span>
              </div>
            )}

            {/* Protocol Fee */}
            {quote.recommended.fees?.protocolFeeUsd && (
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-light">Protocol Fee</span>
                <span className="text-white font-light">${quote.recommended.fees.protocolFeeUsd}</span>
              </div>
            )}

            {/* Total Fee */}
            {quote.recommended.fees?.totalFeeUsd && (
              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span className="text-white/40 font-light">Total Fee</span>
                <span className="text-white font-light">${quote.recommended.fees.totalFeeUsd}</span>
              </div>
            )}

            {/* Tags */}
            {quote.recommended.tags && quote.recommended.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quote.recommended.tags.map((tag: string) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Status */}
            <div className="flex justify-between text-sm border-t border-white/10 pt-2">
              <span className="text-white/40 font-light">Status</span>
              {getStatusBadge()}
            </div>

            {/* Alternative Routes */}
            {quote.alternatives && quote.alternatives.length > 0 && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-white/40 mb-2">Alternative Routes:</p>
                <div className="space-y-2">
                  {quote.alternatives.slice(0, 2).map((alt: any, i: number) => (
                    <div key={i} className="text-xs flex justify-between text-white/60">
                      <span>{alt.toolName || 'Route ' + (i + 1)}</span>
                      <span>{alt.toAmountFormatted} USDC (${alt.totalFeeUsd} fee)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Steps */}
        {flowStatus !== 'idle' && flowStatus !== 'failed' && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  flowStatus === 'quoting' ? 'bg-tago-yellow-400 text-black' :
                  ['signing', 'bridging', 'completed'].includes(flowStatus) ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {['signing', 'bridging', 'completed'].includes(flowStatus) ? '✓' : '1'}
                </div>
                <span className={`text-sm ${flowStatus === 'quoting' ? 'text-white' : 'text-white/60'}`}>
                  Get Quote
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  flowStatus === 'signing' ? 'bg-tago-yellow-400 text-black' :
                  ['bridging', 'completed'].includes(flowStatus) ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {['bridging', 'completed'].includes(flowStatus) ? '✓' : '2'}
                </div>
                <span className={`text-sm ${flowStatus === 'signing' ? 'text-white' : 'text-white/60'}`}>
                  Sign Transaction
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  flowStatus === 'bridging' ? 'bg-tago-yellow-400 text-black' :
                  flowStatus === 'completed' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {flowStatus === 'completed' ? '✓' : '3'}
                </div>
                <span className={`text-sm ${flowStatus === 'bridging' ? 'text-white' : 'text-white/60'}`}>
                  Bridge to HyperEVM
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  flowStatus === 'completed' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {flowStatus === 'completed' ? '✓' : '4'}
                </div>
                <span className={`text-sm ${flowStatus === 'completed' ? 'text-white' : 'text-white/60'}`}>
                  Deposit Complete
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!quote ? (
          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleGetQuote}
            loading={flowStatus === 'quoting'}
            disabled={!walletAddress || !amount || loading}
          >
            Get Quote
          </Button>
        ) : flowStatus === 'completed' ? (
          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled
            className="!bg-green-500 !text-white"
          >
            Deposit Complete!
          </Button>
        ) : (
          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleSwap}
            loading={isLoading}
            disabled={flowStatus === 'failed'}
          >
            {flowStatus === 'signing' ? 'Confirm in Wallet...' :
             flowStatus === 'bridging' ? 'Bridging...' :
             'Confirm Swap'}
          </Button>
        )}

        {/* Reset button on failure */}
        {flowStatus === 'failed' && (
          <Button
            variant="ghost"
            fullWidth
            size="lg"
            onClick={() => {
              setFlowStatus('idle');
              setQuote(null);
              setError(null);
            }}
          >
            Try Again
          </Button>
        )}
      </SwapPanel>
    </div>
  );
}
