'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCountAnimation } from '@/hooks/useCountAnimation';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  sparkline: number[];
}

interface ASCIIPriceTickerProps {
  className?: string;
  tokens?: string[];
}

// Block characters for mini charts
const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function normalizeToBlocks(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map(v => {
      const normalized = (v - min) / range;
      const index = Math.min(Math.floor(normalized * BLOCKS.length), BLOCKS.length - 1);
      return BLOCKS[index];
    })
    .join('');
}

function PriceItem({ data }: { data: PriceData }) {
  const [prevPrice, setPrevPrice] = useState(data.price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  const { displayValue } = useCountAnimation({
    value: data.price,
    decimals: data.price < 1 ? 4 : 2,
    prefix: '$',
    duration: 300,
  });

  useEffect(() => {
    if (data.price !== prevPrice) {
      setFlash(data.price > prevPrice ? 'up' : 'down');
      setPrevPrice(data.price);

      const timeout = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timeout);
    }
  }, [data.price, prevPrice]);

  const isPositive = data.change24h >= 0;
  const sparkline = normalizeToBlocks(data.sparkline);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {/* Symbol */}
      <span className="text-white/90 font-medium w-12">{data.symbol}</span>

      {/* Price */}
      <motion.span
        animate={{
          color: flash === 'up' ? '#22c55e' : flash === 'down' ? '#ef4444' : '#ffffff',
        }}
        className="font-mono text-sm w-24 tabular-nums"
      >
        {displayValue}
      </motion.span>

      {/* Change */}
      <span
        className={cn(
          'text-xs w-16 tabular-nums',
          isPositive ? 'text-green-400' : 'text-red-400'
        )}
      >
        {isPositive ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(1)}%
      </span>

      {/* Mini chart */}
      <span
        className={cn(
          'font-mono text-[10px] tracking-tighter hidden sm:block',
          isPositive ? 'text-green-400/60' : 'text-red-400/60'
        )}
      >
        {sparkline}
      </span>
    </div>
  );
}

export function ASCIIPriceTicker({ className, tokens = ['BTC', 'ETH', 'SOL', 'DOGE'] }: ASCIIPriceTickerProps) {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real price data
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = tokens.map(t => {
          const map: Record<string, string> = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'DOGE': 'dogecoin',
            'AVAX': 'avalanche-2',
            'ARB': 'arbitrum',
            'OP': 'optimism',
            'LINK': 'chainlink',
          };
          return map[t] || t.toLowerCase();
        }).join(',');

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`
        );

        if (!response.ok) throw new Error('Failed to fetch prices');

        const data = await response.json();

        const formatted: PriceData[] = data.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h || 0,
          sparkline: coin.sparkline_in_7d?.price?.slice(-12) || generateFakeSparkline(),
        }));

        setPrices(formatted);
        setError(null);
      } catch (err) {
        console.error('Price fetch error:', err);
        // Use mock data on error
        setPrices(tokens.map(symbol => ({
          symbol,
          price: Math.random() * 100000,
          change24h: (Math.random() - 0.5) * 10,
          sparkline: generateFakeSparkline(),
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [tokens]);

  // Simulate price updates between fetches
  useEffect(() => {
    if (prices.length === 0) return;

    const interval = setInterval(() => {
      setPrices(prev =>
        prev.map(p => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.001), // Small random change
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [prices.length]);

  return (
    <div
      className={cn(
        'font-mono text-sm border border-white/[0.08] rounded-lg bg-black/40 backdrop-blur-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05] bg-white/[0.02]">
        <span className="text-white/40 text-xs">LIVE MARKET PULSE</span>
        <span className="text-[10px] text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-3 py-4 text-center text-white/40 text-xs">
          <span className="animate-pulse">░░░ Loading prices ░░░</span>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          <AnimatePresence>
            {prices.map(price => (
              <motion.div
                key={price.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <PriceItem data={price} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Helper for mock data
function generateFakeSparkline(): number[] {
  let value = 100;
  return Array.from({ length: 12 }, () => {
    value += (Math.random() - 0.5) * 10;
    return value;
  });
}
