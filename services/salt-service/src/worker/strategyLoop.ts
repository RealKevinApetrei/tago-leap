import { getSupabaseAdmin } from '@tago-leap/shared/supabase';
import { getActiveStrategies, createStrategyRun, completeStrategyRun } from '../domain/saltRepo.js';
import { getStrategyById } from '../domain/strategyTypes.js';
import { executeBet } from '../clients/pearServiceClient.js';

const LOOP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Strategy loop worker.
 * Runs active strategies on a regular interval.
 */
async function runStrategyLoop() {
  const supabase = getSupabaseAdmin();

  console.log('[StrategyLoop] Starting strategy loop worker...');

  const tick = async () => {
    console.log(`[StrategyLoop] Tick at ${new Date().toISOString()}`);

    try {
      // Get all active strategies
      const activeStrategies = await getActiveStrategies(supabase);
      console.log(`[StrategyLoop] Found ${activeStrategies.length} active strategies`);

      for (const strategy of activeStrategies) {
        const strategyDef = getStrategyById(strategy.strategy_id as any);
        if (!strategyDef) {
          console.warn(`[StrategyLoop] Unknown strategy: ${strategy.strategy_id}`);
          continue;
        }

        console.log(`[StrategyLoop] Processing strategy: ${strategyDef.name}`);

        // Create a run record
        const run = await createStrategyRun(supabase, strategy.id);

        try {
          // Here you would implement the actual strategy logic:
          // 1. Fetch current market data
          // 2. Apply strategy rules (mean reversion, momentum, etc.)
          // 3. Generate trade signals
          // 4. Execute trades via pear-service

          // For now, just log and mark complete
          console.log(`[StrategyLoop] Strategy ${strategyDef.name} would execute with params:`, strategy.params);

          // Example: If we were to execute a bet (commented out for safety)
          // const trade = await executeBet({
          //   userWalletAddress: '0x...', // Would need to get from salt_account
          //   narrativeId: strategyDef.narrativeId,
          //   direction: 'long',
          //   stakeUsd: (strategy.params as any).positionSizeUsd || 100,
          //   riskProfile: 'moderate',
          //   mode: 'paper',
          // });

          await completeStrategyRun(supabase, run.id, {
            message: 'Strategy loop tick completed (no-op)',
            strategyId: strategy.strategy_id,
            params: strategy.params,
          });
        } catch (err) {
          console.error(`[StrategyLoop] Error running strategy ${strategyDef.name}:`, err);
          await completeStrategyRun(supabase, run.id, {}, String(err));
        }
      }
    } catch (err) {
      console.error('[StrategyLoop] Error in strategy loop:', err);
    }
  };

  // Run immediately, then on interval
  await tick();
  setInterval(tick, LOOP_INTERVAL_MS);
}

// Start the worker
runStrategyLoop().catch((err) => {
  console.error('[StrategyLoop] Fatal error:', err);
  process.exit(1);
});
