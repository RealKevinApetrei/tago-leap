#!/usr/bin/env npx tsx
/**
 * Local Strategy Runner
 *
 * Runs the strategy engine locally. NOT deployed to Vercel.
 *
 * Usage:
 *   npx tsx scripts/run-strategies.ts           # Run once
 *   npx tsx scripts/run-strategies.ts --loop    # Run every 60 seconds
 *   npx tsx scripts/run-strategies.ts --interval 30  # Run every 30 seconds
 *
 * [SALT] Robo managers & autonomous agents
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// Strategy execution result
interface StrategyExecutionResult {
  success: boolean;
  action?: 'none' | 'trade_executed' | 'position_closed';
  details?: Record<string, unknown>;
  error?: string;
}

// Position interface from Hyperliquid
interface HyperliquidPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  leverage: {
    type: string;
    value: number;
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const isLoop = args.includes('--loop');
const intervalIndex = args.indexOf('--interval');
const intervalSeconds = intervalIndex !== -1 ? parseInt(args[intervalIndex + 1], 10) : 60;

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('='.repeat(60));
console.log('TAGO Leap Strategy Runner');
console.log('='.repeat(60));
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`API URL: ${apiUrl}`);
console.log(`Mode: ${isLoop ? `Loop (every ${intervalSeconds}s)` : 'Single run'}`);
console.log('='.repeat(60));

// Fetch positions from Hyperliquid
async function getPositions(walletAddress: string): Promise<HyperliquidPosition[]> {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'clearinghouseState',
      user: walletAddress,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid API error: ${response.status}`);
  }

  const data = await response.json();
  const assetPositions = data.assetPositions || [];

  return assetPositions
    .filter((ap: any) => parseFloat(ap.position.szi) !== 0)
    .map((ap: any) => ap.position);
}

// Close position via API
async function closePosition(
  walletAddress: string,
  asset: string,
  size: number,
  isLong: boolean,
  leverage: number
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/pear/positions/close-by-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        asset,
        size,
        isLong,
        leverage,
      }),
    });

    const data = await response.json();
    return response.ok && data.success;
  } catch (error) {
    console.error(`Failed to close ${asset}:`, error);
    return false;
  }
}

// In-memory peak tracking for trailing stop
const peakPrices: Map<string, number> = new Map();

// Execute take profit strategy
async function executeTakeProfit(
  walletAddress: string,
  params: { takeProfitPct?: number; stopLossPct?: number }
): Promise<StrategyExecutionResult> {
  const takeProfitPct = params.takeProfitPct ?? 5;
  const stopLossPct = params.stopLossPct ?? 10;

  console.log(`  Checking positions (TP: ${takeProfitPct}%, SL: ${stopLossPct}%)...`);

  const positions = await getPositions(walletAddress);
  if (positions.length === 0) {
    return { success: true, action: 'none', details: { message: 'No positions' } };
  }

  const closed: { asset: string; reason: string }[] = [];

  for (const pos of positions) {
    const pnlPct = parseFloat(pos.returnOnEquity) * 100;
    const isLong = parseFloat(pos.szi) > 0;
    const posValue = Math.abs(parseFloat(pos.positionValue));
    const leverage = pos.leverage?.value || 1;

    console.log(`    ${pos.coin}: ${pnlPct.toFixed(2)}% (${isLong ? 'LONG' : 'SHORT'})`);

    if (pnlPct >= takeProfitPct) {
      console.log(`    → Closing ${pos.coin} (take profit)`);
      if (await closePosition(walletAddress, pos.coin, posValue, isLong, leverage)) {
        closed.push({ asset: pos.coin, reason: 'take_profit' });
      }
    } else if (pnlPct <= -stopLossPct) {
      console.log(`    → Closing ${pos.coin} (stop loss)`);
      if (await closePosition(walletAddress, pos.coin, posValue, isLong, leverage)) {
        closed.push({ asset: pos.coin, reason: 'stop_loss' });
      }
    }
  }

  return {
    success: true,
    action: closed.length > 0 ? 'position_closed' : 'none',
    details: { closedPositions: closed },
  };
}

// Execute trailing stop strategy
async function executeTrailingStop(
  walletAddress: string,
  params: { trailPct?: number; activationPct?: number }
): Promise<StrategyExecutionResult> {
  const trailPct = params.trailPct ?? 3;
  const activationPct = params.activationPct ?? 2;

  console.log(`  Trailing stop (trail: ${trailPct}%, activation: ${activationPct}%)...`);

  const positions = await getPositions(walletAddress);
  if (positions.length === 0) {
    return { success: true, action: 'none', details: { message: 'No positions' } };
  }

  const closed: { asset: string; peakPnl: number; closedAt: number }[] = [];

  for (const pos of positions) {
    const pnlPct = parseFloat(pos.returnOnEquity) * 100;
    const isLong = parseFloat(pos.szi) > 0;
    const posValue = Math.abs(parseFloat(pos.positionValue));
    const leverage = pos.leverage?.value || 1;
    const peakKey = `${walletAddress}-${pos.coin}`;

    // Track peak
    let peakPnl = peakPrices.get(peakKey) ?? pnlPct;
    if (pnlPct > peakPnl) {
      peakPnl = pnlPct;
      peakPrices.set(peakKey, peakPnl);
    }

    const stopLevel = peakPnl - trailPct;
    const isActivated = peakPnl >= activationPct;

    console.log(`    ${pos.coin}: ${pnlPct.toFixed(2)}% (peak: ${peakPnl.toFixed(2)}%, stop: ${stopLevel.toFixed(2)}%)`);

    if (isActivated && pnlPct <= stopLevel) {
      console.log(`    → Closing ${pos.coin} (trailing stop hit)`);
      if (await closePosition(walletAddress, pos.coin, posValue, isLong, leverage)) {
        peakPrices.delete(peakKey);
        closed.push({ asset: pos.coin, peakPnl, closedAt: pnlPct });
      }
    }
  }

  return {
    success: true,
    action: closed.length > 0 ? 'position_closed' : 'none',
    details: { closedPositions: closed },
  };
}

// Fetch candles from Hyperliquid
async function getCandles(coin: string, interval: string = '15m', limit: number = 50): Promise<any[]> {
  try {
    const endTime = Date.now();
    const intervalMs: Record<string, number> = {
      '5m': 300000, '15m': 900000, '1h': 3600000,
    };
    const startTime = endTime - (limit * (intervalMs[interval] || 900000));

    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: { coin, interval, startTime, endTime },
      }),
    });
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

// Calculate VWAP
function calculateVWAP(candles: any[]): number {
  let tpv = 0, vol = 0;
  for (const c of candles) {
    const tp = (parseFloat(c.h) + parseFloat(c.l) + parseFloat(c.c)) / 3;
    const v = parseFloat(c.v);
    tpv += tp * v;
    vol += v;
  }
  return vol > 0 ? tpv / vol : 0;
}

// Execute VWAP exit strategy
async function executeVWAPExit(
  walletAddress: string,
  params: { minProfitPct?: number }
): Promise<StrategyExecutionResult> {
  const minProfitPct = params.minProfitPct ?? 1;

  console.log(`  VWAP exit (min profit: ${minProfitPct}%)...`);

  const positions = await getPositions(walletAddress);
  if (positions.length === 0) {
    return { success: true, action: 'none', details: { message: 'No positions' } };
  }

  const closed: { asset: string; price: number; vwap: number }[] = [];

  for (const pos of positions) {
    const pnlPct = parseFloat(pos.returnOnEquity) * 100;
    const isLong = parseFloat(pos.szi) > 0;
    const posValue = Math.abs(parseFloat(pos.positionValue));
    const leverage = pos.leverage?.value || 1;
    const size = Math.abs(parseFloat(pos.szi));
    const price = posValue / size;

    const candles = await getCandles(pos.coin, '15m', 50);
    if (candles.length < 10) continue;

    const vwap = calculateVWAP(candles);
    console.log(`    ${pos.coin}: $${price.toFixed(2)} vs VWAP $${vwap.toFixed(2)}`);

    // Exit longs below VWAP, shorts above VWAP (if in profit)
    if (pnlPct >= minProfitPct) {
      if ((isLong && price < vwap) || (!isLong && price > vwap)) {
        console.log(`    → Closing ${pos.coin} (VWAP cross)`);
        if (await closePosition(walletAddress, pos.coin, posValue, isLong, leverage)) {
          closed.push({ asset: pos.coin, price, vwap });
        }
      }
    }
  }

  return {
    success: true,
    action: closed.length > 0 ? 'position_closed' : 'none',
    details: { closedPositions: closed },
  };
}

// Calculate ADX (simplified)
function calculateADX(candles: any[], period: number = 14): number {
  if (candles.length < period + 1) return 50; // Default to strong if not enough data

  let plusDM = 0, minusDM = 0, tr = 0;
  for (let i = 1; i < Math.min(candles.length, period + 1); i++) {
    const h = parseFloat(candles[i].h), l = parseFloat(candles[i].l);
    const ph = parseFloat(candles[i-1].h), pl = parseFloat(candles[i-1].l), pc = parseFloat(candles[i-1].c);

    tr += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const up = h - ph, down = pl - l;
    plusDM += (up > down && up > 0) ? up : 0;
    minusDM += (down > up && down > 0) ? down : 0;
  }

  if (tr === 0) return 50;
  const pdi = (plusDM / tr) * 100, mdi = (minusDM / tr) * 100;
  return pdi + mdi > 0 ? (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 : 0;
}

// Execute ADX momentum strategy
async function executeADXMomentum(
  walletAddress: string,
  params: { adxThreshold?: number; minProfitPct?: number }
): Promise<StrategyExecutionResult> {
  const adxThreshold = params.adxThreshold ?? 25;
  const minProfitPct = params.minProfitPct ?? 2;

  console.log(`  ADX momentum (threshold: ${adxThreshold}, min profit: ${minProfitPct}%)...`);

  const positions = await getPositions(walletAddress);
  if (positions.length === 0) {
    return { success: true, action: 'none', details: { message: 'No positions' } };
  }

  const closed: { asset: string; adx: number }[] = [];

  for (const pos of positions) {
    const pnlPct = parseFloat(pos.returnOnEquity) * 100;
    const isLong = parseFloat(pos.szi) > 0;
    const posValue = Math.abs(parseFloat(pos.positionValue));
    const leverage = pos.leverage?.value || 1;

    const candles = await getCandles(pos.coin, '15m', 50);
    const adx = calculateADX(candles);

    console.log(`    ${pos.coin}: ADX ${adx.toFixed(1)} (pnl: ${pnlPct.toFixed(2)}%)`);

    // Exit if in profit and trend is weakening
    if (pnlPct >= minProfitPct && adx < adxThreshold) {
      console.log(`    → Closing ${pos.coin} (weak trend)`);
      if (await closePosition(walletAddress, pos.coin, posValue, isLong, leverage)) {
        closed.push({ asset: pos.coin, adx });
      }
    }
  }

  return {
    success: true,
    action: closed.length > 0 ? 'position_closed' : 'none',
    details: { closedPositions: closed },
  };
}

// Create strategy run record
async function createStrategyRun(
  strategyId: string,
  status: 'running' | 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
) {
  const { error: dbError } = await supabase.from('strategy_runs').insert({
    strategy_id: strategyId,
    status,
    result: result || null,
    error: error || null,
    started_at: new Date().toISOString(),
    completed_at: status !== 'running' ? new Date().toISOString() : null,
  });

  if (dbError) {
    console.error('Failed to log strategy run:', dbError);
  }
}

// Main execution cycle
async function runCycle() {
  const cycleStart = new Date();
  console.log(`\n[${cycleStart.toISOString()}] Starting cycle...`);

  let accountsProcessed = 0;
  let strategiesRun = 0;
  let tradesExecuted = 0;

  try {
    // Get all salt accounts with users
    const { data: accounts, error: accountsError } = await supabase
      .from('salt_accounts')
      .select('*, users!inner(wallet_address)');

    if (accountsError) {
      console.error('Failed to fetch accounts:', accountsError);
      return;
    }

    console.log(`Found ${accounts?.length || 0} account(s)`);

    for (const account of accounts || []) {
      const walletAddress = (account as any).users?.wallet_address;
      if (!walletAddress) continue;

      // Get active strategies for this account
      const { data: strategies } = await supabase
        .from('salt_strategies')
        .select('*')
        .eq('salt_account_id', account.id)
        .eq('active', true);

      if (!strategies || strategies.length === 0) continue;

      accountsProcessed++;
      console.log(`\nAccount ${account.id.slice(0, 8)}... (${strategies.length} active strategies)`);

      for (const strategy of strategies) {
        strategiesRun++;
        const strategyType = strategy.strategy_id;
        const params = strategy.params as Record<string, unknown> || {};

        console.log(`  Running: ${strategyType}`);

        try {
          let result: StrategyExecutionResult;

          switch (strategyType) {
            case 'take-profit':
              result = await executeTakeProfit(walletAddress, {
                takeProfitPct: (params.takeProfitPct as number) ?? 5,
                stopLossPct: (params.stopLossPct as number) ?? 10,
              });
              break;
            case 'trailing-stop':
              result = await executeTrailingStop(walletAddress, {
                trailPct: (params.trailPct as number) ?? 3,
                activationPct: (params.activationPct as number) ?? 2,
              });
              break;
            case 'vwap-exit':
              result = await executeVWAPExit(walletAddress, {
                minProfitPct: (params.minProfitPct as number) ?? 1,
              });
              break;
            case 'adx-momentum':
              result = await executeADXMomentum(walletAddress, {
                adxThreshold: (params.adxThreshold as number) ?? 25,
                minProfitPct: (params.minProfitPct as number) ?? 2,
              });
              break;
            default:
              console.log(`  Unknown strategy: ${strategyType}`);
              result = { success: false, error: `Unknown strategy: ${strategyType}` };
          }

          if (result.action === 'position_closed') {
            tradesExecuted++;
          }

          await createStrategyRun(strategy.id, result.success ? 'completed' : 'failed', result as Record<string, unknown>, result.error);
          console.log(`  Result: ${result.action || 'none'}`);
        } catch (error: any) {
          await createStrategyRun(strategy.id, 'failed', undefined, error?.message);
          console.error(`  Error: ${error?.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Cycle error:', error);
  }

  const duration = Date.now() - cycleStart.getTime();
  console.log(`\nCycle complete in ${duration}ms`);
  console.log(`  Accounts: ${accountsProcessed}, Strategies: ${strategiesRun}, Trades: ${tradesExecuted}`);
}

// Entry point
async function main() {
  if (isLoop) {
    console.log(`\nRunning in loop mode (every ${intervalSeconds} seconds)`);
    console.log('Press Ctrl+C to stop\n');

    // Run immediately
    await runCycle();

    // Then loop
    setInterval(runCycle, intervalSeconds * 1000);
  } else {
    await runCycle();
    console.log('\nDone.');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
