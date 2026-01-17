'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SwapPanel, SwapField, SwapDivider } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { lifiApi, ApiError } from '@/lib/api';
import { TradeErrorDisplay, parseApiErrorToTradeError } from '@/components/TradeErrorDisplay';
import type { TradeError } from '@tago-leap/shared/types';

interface ChainOption {
  chainId: number;
  chainName: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

interface RouteStep {
  stepIndex: number;
  type: string;
  action: string;
  tool: string;
  toolName: string;
  fromChainName: string;
  toChainName: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  estimatedDurationSeconds: number;
  fees: {
    gasCostUsd: string;
    protocolFeeUsd: string;
  };
}

interface QuoteResponse {
  id: string;
  status: string | null;
  recommended: {
    routeId: string;
    fromAmountFormatted: string;
    toAmountFormatted: string;
    toAmountUsd: string;
    estimatedDurationSeconds: number;
    estimatedDurationFormatted: string;
    exchangeRate: string;
    fees: {
      gasCostUsd: string;
      protocolFeeUsd: string;
      totalFeeUsd: string;
    };
    steps: RouteStep[];
    tags?: string[];
  };
  alternatives: any[];
  routeCount: number;
  saltWalletAddress?: string;
}

type DestinationType = 'hyperliquid' | 'salt';

export default function OnboardPage() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();

  // Destination from query param (default to hyperliquid)
  const destinationParam = searchParams.get('destination') as DestinationType | null;
  const destination: DestinationType = destinationParam === 'salt' ? 'salt' : 'hyperliquid';

  const [options, setOptions] = useState<ChainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<TradeError | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fromChain, setFromChain] = useState('');
  const [fromToken, setFromToken] = useState('');
  const [amount, setAmount] = useState('');

  // Use connected wallet address
  const walletAddress = address || '';

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
        if (err instanceof ApiError && err.tradeError) {
          setError(err.tradeError);
        } else {
          setError(parseApiErrorToTradeError(err));
        }
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
      return;
    }

    setQuoting(true);
    setError(null);
    setQuote(null);

    try {
      // Get quote with deposit destination preference
      const result = await lifiApi.getQuote({
        userWalletAddress: walletAddress,
        fromChainId: parseInt(fromChain),
        fromTokenAddress: fromToken,
        amount,
        toTokenAddress: '0x0000000000000000000000000000000000000000', // Native USDC on HyperEVM
        // depositToSaltWallet: destination === 'salt', // Uncomment when API supports this
      });
      setQuote(result);
      setFlowStatus('idle');
    } catch (err) {
      console.error('Failed to get quote:', err);
      if (err instanceof ApiError && err.tradeError) {
        setError(err.tradeError);
      } else {
        setError(parseApiErrorToTradeError(err));
      }
    } finally {
      setQuoting(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    setLoading(true);
    setError(null);

    try {
      await lifiApi.deposit({ flowId: quote.id });
      setSuccess(true);
      setQuote(null);
      setAmount('');
    } catch (err) {
      console.error('Failed to deposit:', err);
      if (err instanceof ApiError && err.tradeError) {
        setError(err.tradeError);
      } else {
        setError(parseApiErrorToTradeError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (quote) {
      handleDeposit();
    } else {
      handleGetQuote();
    }
  };

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SwapPanel title="Deposit to Hyperliquid" subtitle="Bridge assets from any chain">
          <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.08] text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-tago-yellow-400/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-tago-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Connect Your Wallet</h3>
              <p className="text-sm text-white/50 font-light">
                Connect your wallet to bridge assets to Hyperliquid for trading.
              </p>
            </div>
            <ConnectButton />
          </div>
        </SwapPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected wallet header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/40 font-light">Connected Wallet</span>
            <p className="text-sm text-white font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          </div>
          <ConnectButton.Custom>
            {({ openAccountModal }) => (
              <button onClick={openAccountModal} className="text-xs text-white/40 hover:text-white">
                Change
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </Card>

      {/* Success message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-400 font-medium">Deposit initiated successfully!</p>
              <p className="text-xs text-green-400/60 mt-0.5">
                Your funds are being bridged to Hyperliquid. This may take a few minutes.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSuccess(false)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <SwapPanel
        title="Deposit to Hyperliquid"
        subtitle={destination === 'salt'
          ? 'Bridge assets to your Salt robo trading account'
          : 'Bridge assets to your Hyperliquid trading account'
        }
      >
        {/* Destination indicator */}
        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-tago-yellow-400/10 flex items-center justify-center flex-shrink-0">
            {destination === 'salt' ? (
              <svg className="w-4 h-4 text-tago-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-tago-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">
              {destination === 'salt' ? 'Salt Robo Account' : 'Hyperliquid Account'}
            </p>
            <p className="text-xs text-white/40 truncate">
              {destination === 'salt'
                ? 'Funds will be managed by automated strategies'
                : `Funds will be available for trading at ${walletAddress.slice(0, 10)}...`
              }
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <TradeErrorDisplay
            error={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
          />
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
            <span className="text-sm text-white/40 font-light">Receive on Hyperliquid</span>
            <Badge variant="yellow">HyperEVM</Badge>
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {quote?.recommended?.toAmountFormatted || amount || '0.0'} USDC
            {quote?.recommended?.toAmountFormatted || amount || '0.0'} USDC
          </div>
          {quote?.recommended?.toAmountUsd && (
            <p className="text-xs text-white/40 mt-1">~${quote.recommended.toAmountUsd}</p>
          )}
        </div>

        {/* Quote Details */}
        {quote?.recommended && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            {/* Route Info */}
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Exchange Rate</span>
              <span className="text-white font-light">{quote.recommended.exchangeRate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Estimated Time</span>
              <span className="text-white font-light">{quote.recommended.estimatedDurationFormatted}</span>
            </div>

            {/* ETA */}
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Gas Cost</span>
              <span className="text-white font-light">${quote.recommended.fees.gasCostUsd}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Protocol Fee</span>
              <span className="text-white font-light">${quote.recommended.fees.protocolFeeUsd}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/[0.08]">
              <span className="text-white/60 font-medium">Total Fees</span>
              <span className="text-tago-yellow-400 font-medium">${quote.recommended.fees.totalFeeUsd}</span>
            </div>

            {/* Route steps */}
            {quote.recommended.steps && quote.recommended.steps.length > 0 && (
              <details className="group mt-2">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 flex items-center gap-1">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Route details ({quote.recommended.steps.length} steps)
                </summary>
                <div className="mt-2 space-y-2">
                  {quote.recommended.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                        {step.stepIndex}
                      </span>
                      <span className="text-white/60">{step.action}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Route tags */}
            {quote.recommended.tags && quote.recommended.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {quote.recommended.tags.map((tag) => (
                  <Badge key={tag} variant={tag === 'RECOMMENDED' ? 'yellow' : 'info'}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {!quote ? (
          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleGetQuote}
            loading={quoting}
            disabled={!walletAddress || !amount || !fromChain || !fromToken}
          >
            {quoting ? 'Getting Quote...' : 'Get Quote'}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              variant="yellow"
              fullWidth
              size="lg"
              onClick={handleDeposit}
              loading={loading}
            >
              {loading ? 'Processing...' : 'Confirm Deposit'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setQuote(null);
                setError(null);
              }}
            >
              Get New Quote
            </Button>
          </div>
        )}
      </SwapPanel>

      {/* Help text */}
      <div className="text-center">
        <p className="text-xs text-white/30">
          Powered by <a href="https://li.fi" target="_blank" rel="noopener noreferrer" className="text-tago-yellow-400 hover:underline">LI.FI</a> cross-chain aggregation
        </p>
      </div>
    </div>
  );
}
