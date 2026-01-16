'use client';

import { useState, useEffect } from 'react';
import { SwapPanel, SwapField, SwapDivider } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { lifiApi } from '@/lib/api';

interface ChainOption {
  chainId: number;
  chainName: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

export default function OnboardPage() {
  const [options, setOptions] = useState<ChainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<any>(null);

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
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  const selectedChain = options.find((o) => String(o.chainId) === fromChain);
  const selectedToken = selectedChain?.tokens.find((t) => t.address === fromToken);

  const handleGetQuote = async () => {
    if (!walletAddress || !fromChain || !fromToken || !amount) {
      alert('Please fill in all fields');
      return;
    }

    setQuoting(true);
    try {
      const result = await lifiApi.getQuote({
        userWalletAddress: walletAddress,
        fromChainId: parseInt(fromChain),
        fromTokenAddress: fromToken,
        amount,
        toTokenAddress: '0xHYPER_USDC_PLACEHOLDER',
      });
      setQuote(result);
    } catch (err) {
      console.error('Failed to get quote:', err);
      alert('Failed to get quote. Please try again.');
    } finally {
      setQuoting(false);
    }
  };

  const handleDeposit = async () => {
    if (!quote) return;

    setLoading(true);
    try {
      await lifiApi.deposit({ flowId: quote.id });
      alert('Deposit initiated successfully!');
      setQuote(null);
      setAmount('');
    } catch (err) {
      console.error('Failed to deposit:', err);
      alert('Failed to deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          }}
          options={options.map((o) => ({
            label: o.chainName,
            value: String(o.chainId),
          }))}
          placeholder="Select chain"
        />

        {/* From Token */}
        {selectedChain && (
          <Select
            label="Token"
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value)}
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
          onChange={setAmount}
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
            {amount || '0.0'} USDC
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Estimated Gas</span>
              <span className="text-white font-light">~$5.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Bridge Fee</span>
              <span className="text-white font-light">~0.1%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Status</span>
              <Badge variant="success">{quote.status}</Badge>
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
            loading={quoting}
            disabled={!walletAddress || !amount}
          >
            Get Quote
          </Button>
        ) : (
          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleDeposit}
            loading={loading}
          >
            Confirm Deposit
          </Button>
        )}
      </SwapPanel>
    </div>
  );
}
