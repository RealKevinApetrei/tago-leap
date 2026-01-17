import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import { getActiveSaltAccounts, getLatestPolicy } from '@/lib/api-server/domain/saltRepo';
import {
  calculateRiskMetrics,
  type PositionData,
} from '@/lib/api-server/domain/riskCalculator';

// Vercel cron config - runs daily at midnight UTC
// { "crons": [{ "path": "/api/cron/risk-daily", "schedule": "0 0 * * *" }] }

interface HyperliquidPosition {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    liquidationPx: string | null;
    leverage: {
      type: string;
      value: number;
    };
  };
}

interface HyperliquidResponse {
  marginSummary?: {
    accountValue?: string;
    totalMarginUsed?: string;
  };
  assetPositions?: HyperliquidPosition[];
}

async function fetchHyperliquidData(walletAddress: string): Promise<{
  equity: number;
  positions: PositionData[];
}> {
  try {
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

    const data: HyperliquidResponse = await response.json();
    const equity = parseFloat(data.marginSummary?.accountValue || '0');

    // Fetch current prices
    let pricesMap: Record<string, number> = {};
    try {
      const pricesResponse = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      });
      if (pricesResponse.ok) {
        pricesMap = await pricesResponse.json();
      }
    } catch {
      // Continue without prices
    }

    // Parse positions
    const positions: PositionData[] = (data.assetPositions || [])
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => {
        const pos = ap.position;
        const size = parseFloat(pos.szi);
        const isLong = size > 0;
        const entryPrice = parseFloat(pos.entryPx);
        const notional = parseFloat(pos.positionValue);
        const currentPrice = pricesMap[pos.coin] || (notional / Math.abs(size));
        const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;

        return {
          asset: pos.coin,
          size: Math.abs(size),
          entryPrice,
          currentPrice,
          notional: isLong ? notional : -notional,
          unrealizedPnl: parseFloat(pos.unrealizedPnl),
          leverage: pos.leverage?.value || 1,
          liquidationPrice: liquidationPx,
          isLong,
        };
      });

    return { equity, positions };
  } catch (err) {
    console.error(`[risk-daily] Failed to fetch data:`, err);
    return { equity: 0, positions: [] };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let snapshotsCreated = 0;
  let alertsCleaned = 0;

  try {
    // Get all active Salt accounts
    const accounts = await getActiveSaltAccounts(supabase);
    console.log(`[risk-daily] Processing ${accounts.length} accounts for date ${today}`);

    for (const account of accounts) {
      try {
        const userWallet = account.user_wallet;
        if (!userWallet) continue;

        // Check if we already have a snapshot for today
        const { data: existingSnapshot } = await supabase
          .from('risk_metrics_daily')
          .select('id')
          .eq('salt_account_id', account.id)
          .eq('date', today)
          .single();

        if (existingSnapshot) {
          // Update existing snapshot with closing values
          const { equity, positions } = await fetchHyperliquidData(userWallet);

          if (equity > 0) {
            const peakEquity = (account as any).peak_equity || equity;
            const metrics = calculateRiskMetrics(positions, equity, peakEquity);

            // Get today's opening equity from the existing snapshot
            const { data: snapshot } = await supabase
              .from('risk_metrics_daily')
              .select('opening_equity, high_equity, low_equity')
              .eq('id', existingSnapshot.id)
              .single();

            const openingEquity = snapshot?.opening_equity || equity;
            const highEquity = Math.max(snapshot?.high_equity || equity, equity);
            const lowEquity = Math.min(snapshot?.low_equity || equity, equity);
            const dailyPnl = equity - openingEquity;
            const dailyReturnPct = openingEquity > 0 ? (dailyPnl / openingEquity) * 100 : 0;

            await supabase
              .from('risk_metrics_daily')
              .update({
                closing_equity: equity,
                high_equity: highEquity,
                low_equity: lowEquity,
                daily_pnl: dailyPnl,
                daily_return_pct: dailyReturnPct,
                current_drawdown_pct: metrics.currentDrawdownPct,
                max_drawdown_pct: Math.max(snapshot?.max_drawdown_pct || 0, metrics.currentDrawdownPct),
                total_notional: metrics.totalNotional,
                position_count: metrics.positionCount,
                avg_leverage: metrics.avgLeverage,
                largest_position_pct: metrics.largestPositionPct,
                sector_concentration: metrics.sectorConcentration,
                nearest_liquidation_pct: metrics.nearestLiquidationPct,
              })
              .eq('id', existingSnapshot.id);
          }
        } else {
          // Create new snapshot for today
          const { equity, positions } = await fetchHyperliquidData(userWallet);

          if (equity > 0) {
            const peakEquity = (account as any).peak_equity || equity;
            const metrics = calculateRiskMetrics(positions, equity, peakEquity);

            await supabase.from('risk_metrics_daily').insert({
              salt_account_id: account.id,
              date: today,
              opening_equity: equity,
              closing_equity: equity,
              high_equity: equity,
              low_equity: equity,
              daily_pnl: 0,
              daily_return_pct: 0,
              current_drawdown_pct: metrics.currentDrawdownPct,
              max_drawdown_pct: metrics.currentDrawdownPct,
              total_notional: metrics.totalNotional,
              position_count: metrics.positionCount,
              avg_leverage: metrics.avgLeverage,
              largest_position_pct: metrics.largestPositionPct,
              sector_concentration: metrics.sectorConcentration,
              nearest_liquidation_pct: metrics.nearestLiquidationPct,
            });

            snapshotsCreated++;
          }
        }
      } catch (err) {
        console.error(`[risk-daily] Error processing account ${account.id}:`, err);
      }
    }

    // Clean up old acknowledged alerts (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await supabase
      .from('risk_alerts')
      .delete()
      .eq('acknowledged', true)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id', { count: 'exact' });

    alertsCleaned = count || 0;

    // Auto-resolve old unacknowledged info/warning alerts (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from('risk_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .in('severity', ['info', 'warning'])
      .is('resolved_at', null)
      .lt('created_at', sevenDaysAgo.toISOString());

    console.log(`[risk-daily] Complete: ${snapshotsCreated} snapshots, ${alertsCleaned} alerts cleaned`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: today,
      snapshots_created: snapshotsCreated,
      alerts_cleaned: alertsCleaned,
      accounts_processed: accounts.length,
    });
  } catch (err) {
    console.error('[risk-daily] Failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Daily risk snapshot failed',
      },
      { status: 500 }
    );
  }
}
