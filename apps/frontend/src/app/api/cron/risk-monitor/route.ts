import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';
import {
  getActiveSaltAccounts,
  getLatestPolicy,
  updateSaltAccountEquity,
} from '@/lib/api-server/domain/saltRepo';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getPositions, closePosition } from '@/lib/api-server/clients/pearClient';
import {
  calculateRiskMetrics,
  determineRiskAction,
  type PositionData,
  type RiskAction,
  type RiskTier,
} from '@/lib/api-server/domain/riskCalculator';

// Vercel cron config - add to vercel.json:
// { "crons": [{ "path": "/api/cron/risk-monitor", "schedule": "*/5 * * * *" }] }

interface MonitorResult {
  account_id: string;
  user_wallet: string;
  action: RiskTier;
  drawdown: number;
  liquidation_distance?: number;
  message?: string;
  alert_created?: boolean;
}

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
    // Fetch clearinghouse state
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

    // Fetch current prices for liquidation calculation
    let pricesMap: Record<string, number> = {};
    try {
      const pricesResponse = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      });
      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json();
        pricesMap = pricesData;
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
    console.error(`[risk-monitor] Failed to fetch data for ${walletAddress}:`, err);
    return { equity: 0, positions: [] };
  }
}

async function closeAllPositions(
  accessToken: string
): Promise<{ closed: number; errors: string[] }> {
  const errors: string[] = [];
  let closed = 0;

  try {
    const positions = await getPositions(accessToken);
    const openPositions = positions.filter(p => p.status === 'open');

    for (const position of openPositions) {
      try {
        await closePosition(accessToken, position.id);
        closed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Position ${position.id}: ${errorMsg}`);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed to get positions: ${errorMsg}`);
  }

  return { closed, errors };
}

async function createRiskAlert(
  supabase: any,
  saltAccountId: string,
  alertType: string,
  severity: string,
  thresholdValue: number,
  actualValue: number,
  message: string,
  actionTaken: string
): Promise<void> {
  try {
    await supabase.from('risk_alerts').insert({
      salt_account_id: saltAccountId,
      alert_type: alertType,
      severity,
      threshold_value: thresholdValue,
      actual_value: actualValue,
      message,
      action_taken: actionTaken,
    });
  } catch (err) {
    console.error('[risk-monitor] Failed to create alert:', err);
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow requests with valid cron secret OR from Vercel's cron
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const results: MonitorResult[] = [];

  try {
    // Get all active Salt accounts
    const accounts = await getActiveSaltAccounts(supabase);
    console.log(`[risk-monitor] Monitoring ${accounts.length} accounts`);

    for (const account of accounts) {
      try {
        const userWallet = account.user_wallet;
        if (!userWallet) continue;

        // Fetch current data from Hyperliquid
        const { equity, positions } = await fetchHyperliquidData(userWallet);

        if (equity === 0) {
          results.push({
            account_id: account.id,
            user_wallet: userWallet,
            action: 'none',
            drawdown: 0,
            message: 'No equity',
          });
          continue;
        }

        // Update drawdown tracking
        const equityUpdate = await updateSaltAccountEquity(supabase, account.id, equity);
        const peakEquity = equityUpdate.peak_equity;

        // Calculate full risk metrics
        const metrics = calculateRiskMetrics(positions, equity, peakEquity);

        // Get policy
        const policy = await getLatestPolicy(supabase, account.id);
        const maxDrawdown = policy?.max_drawdown_pct || 15;
        const autoCloseEnabled = (account as any).auto_close_enabled === true;
        const autoPartialCloseEnabled = (policy as any)?.auto_partial_close_enabled === true;
        const minLiquidationDistance = (policy as any)?.min_liquidation_distance_pct || 10;

        // Determine risk action
        const riskAction = determineRiskAction(metrics, {
          maxDrawdownPct: maxDrawdown,
          warningDrawdownPct: (policy as any)?.warning_drawdown_pct,
          rebalanceDrawdownPct: (policy as any)?.rebalance_drawdown_pct,
          partialCloseDrawdownPct: (policy as any)?.partial_close_drawdown_pct,
          minLiquidationDistancePct: minLiquidationDistance,
          autoCloseEnabled,
          autoPartialCloseEnabled,
        });

        let alertCreated = false;

        // Execute action based on tier
        switch (riskAction.tier) {
          case 'full':
            if (autoCloseEnabled) {
              const accessToken = await getValidAccessToken(supabase, userWallet);
              if (accessToken) {
                const closeResult = await closeAllPositions(accessToken);
                await createRiskAlert(
                  supabase,
                  account.id,
                  'drawdown',
                  'critical',
                  maxDrawdown,
                  metrics.currentDrawdownPct,
                  `All positions closed: drawdown ${metrics.currentDrawdownPct.toFixed(1)}% exceeded limit`,
                  'full_close'
                );
                alertCreated = true;
                results.push({
                  account_id: account.id,
                  user_wallet: userWallet,
                  action: 'full',
                  drawdown: metrics.currentDrawdownPct,
                  liquidation_distance: metrics.nearestLiquidationPct,
                  message: `Closed ${closeResult.closed} positions`,
                  alert_created: true,
                });
              }
            }
            break;

          case 'partial':
            if (autoPartialCloseEnabled) {
              // Log partial close action (actual partial close would need more logic)
              await createRiskAlert(
                supabase,
                account.id,
                'drawdown',
                'critical',
                maxDrawdown,
                metrics.currentDrawdownPct,
                `Partial close triggered: drawdown ${metrics.currentDrawdownPct.toFixed(1)}% at limit`,
                'partial_close'
              );
              alertCreated = true;
            }
            results.push({
              account_id: account.id,
              user_wallet: userWallet,
              action: 'partial',
              drawdown: metrics.currentDrawdownPct,
              liquidation_distance: metrics.nearestLiquidationPct,
              message: riskAction.reason,
              alert_created: alertCreated,
            });
            break;

          case 'action':
            await createRiskAlert(
              supabase,
              account.id,
              metrics.nearestLiquidationPct < minLiquidationDistance ? 'liquidation' : 'drawdown',
              'warning',
              metrics.nearestLiquidationPct < minLiquidationDistance ? minLiquidationDistance : maxDrawdown,
              metrics.nearestLiquidationPct < minLiquidationDistance ? metrics.nearestLiquidationPct : metrics.currentDrawdownPct,
              riskAction.reason || 'Risk action required',
              'notification'
            );
            alertCreated = true;
            results.push({
              account_id: account.id,
              user_wallet: userWallet,
              action: 'action',
              drawdown: metrics.currentDrawdownPct,
              liquidation_distance: metrics.nearestLiquidationPct,
              message: riskAction.reason,
              alert_created: true,
            });
            break;

          case 'warning':
            await createRiskAlert(
              supabase,
              account.id,
              'drawdown',
              'info',
              maxDrawdown,
              metrics.currentDrawdownPct,
              riskAction.reason || 'Warning threshold reached',
              'notification'
            );
            alertCreated = true;
            results.push({
              account_id: account.id,
              user_wallet: userWallet,
              action: 'warning',
              drawdown: metrics.currentDrawdownPct,
              liquidation_distance: metrics.nearestLiquidationPct,
              message: riskAction.reason,
              alert_created: true,
            });
            break;

          case 'info':
          case 'none':
          default:
            results.push({
              account_id: account.id,
              user_wallet: userWallet,
              action: riskAction.tier,
              drawdown: metrics.currentDrawdownPct,
              liquidation_distance: metrics.nearestLiquidationPct,
            });
            break;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          account_id: account.id,
          user_wallet: account.user_wallet || 'unknown',
          action: 'none',
          drawdown: 0,
          message: `Error: ${errorMsg}`,
        });
      }
    }

    const summary = {
      total: results.length,
      monitored: results.filter(r => r.action === 'none' || r.action === 'info').length,
      warnings: results.filter(r => r.action === 'warning').length,
      actions: results.filter(r => r.action === 'action').length,
      partial_closes: results.filter(r => r.action === 'partial').length,
      full_closes: results.filter(r => r.action === 'full').length,
      alerts_created: results.filter(r => r.alert_created).length,
    };

    console.log(`[risk-monitor] Complete:`, summary);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results,
    });
  } catch (err) {
    console.error('[risk-monitor] Failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Risk monitoring failed',
      },
      { status: 500 }
    );
  }
}
