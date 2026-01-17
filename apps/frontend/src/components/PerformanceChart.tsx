'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PerformanceDataPoint {
  timestamp: number;
  date: string;
  longPrice: number;
  shortPrice: number;
  performance: number;
}

interface NarrativePerformance {
  narrativeId: string;
  longAsset: string;
  shortAsset: string;
  dataPoints: PerformanceDataPoint[];
  totalReturn: number;
  maxDrawdown: number;
}

interface PerformanceChartProps {
  longAsset: string;
  shortAsset: string;
  days?: number;
}

const PEAR_SERVICE_URL = process.env.NEXT_PUBLIC_PEAR_SERVICE_URL || 'http://localhost:3001';

export function PerformanceChart({ longAsset, shortAsset, days = 180 }: PerformanceChartProps) {
  const [data, setData] = useState<NarrativePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerformance() {
      if (!longAsset || !shortAsset) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `${PEAR_SERVICE_URL}/narratives/custom/performance?long=${longAsset}&short=${shortAsset}&days=${days}`;
        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok || !result.success) {
          // Extract error message from API response
          const errorMsg = result.error?.message || result.message || 'Failed to fetch performance data';
          throw new Error(errorMsg);
        }

        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch performance:', err);
        // Show user-friendly error message
        const errorMessage = err instanceof Error ? err.message : 'Failed to load performance data';
        // If it's a token not found error, show which token
        if (errorMessage.includes('not found on CoinGecko')) {
          setError(`Historical data not available for this token pair`);
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [longAsset, shortAsset, days]);

  if (!longAsset || !shortAsset) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <p className="text-white/40 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!data || data.dataPoints.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <p className="text-white/40 text-sm text-center">No historical data available</p>
      </div>
    );
  }

  const isPositive = data.totalReturn >= 0;

  // Format data for chart - sample every 7 days for cleaner display
  const chartData = data.dataPoints.filter((_, i) => i % 7 === 0 || i === data.dataPoints.length - 1);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as PerformanceDataPoint;
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg px-3 py-2 text-sm">
          <p className="text-white/60 mb-1">{point.date}</p>
          <p className={point.performance >= 0 ? 'text-green-400' : 'text-red-400'}>
            {point.performance >= 0 ? '+' : ''}{point.performance.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white/80 text-sm font-medium">Historical Performance</h3>
          <p className="text-white/40 text-xs">
            {longAsset} vs {shortAsset} ({days} days)
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{data.totalReturn.toFixed(2)}%
          </p>
          <p className="text-white/40 text-xs">
            Max DD: {data.maxDrawdown.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short' });
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="performance"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              fill={isPositive ? 'url(#positiveGradient)' : 'url(#negativeGradient)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
