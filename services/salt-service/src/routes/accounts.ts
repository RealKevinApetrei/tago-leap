import { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  SaltAccount,
  SaltPolicy,
  SaltStrategy,
  SaltPolicyInput,
  CreateStrategyRequest,
  Trade,
  StrategyRun,
} from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import {
  createSaltAccount,
  getSaltAccountById,
  getSaltAccountByUserId,
  getSaltAccountByWalletAddress,
  upsertSaltPolicy,
  getLatestPolicy,
  createSaltStrategy,
  getStrategiesByAccountId,
  getStrategyRunsByAccountId,
} from '../domain/saltRepo.js';
import { getOrCreateSaltWallet } from '../domain/saltWalletService.js';
import { validatePolicy } from '../domain/policyTypes.js';
import { getAllStrategies, getStrategyById } from '../domain/strategyTypes.js';
import { executeStrategyTrade, ExecuteTradeParams, TradeExecutionResult } from '../domain/strategyExecutor.js';
import { getTradesBySaltAccount } from '../clients/pearServiceClient.js';

interface AccountWithDetails {
  account: SaltAccount;
  policy: SaltPolicy | null;
  strategies: SaltStrategy[];
}

export async function accountsRoutes(app: FastifyInstance) {
  /**
   * GET /salt/strategies - Get available strategy definitions
   */
  app.get('/strategies', async () => {
    const strategies = getAllStrategies();
    return {
      success: true,
      data: strategies,
    };
  });

  /**
   * GET /salt/wallets/:address - Get or create salt wallet by user wallet address
   * This is the main endpoint for the requirement:
   * - Input: user's wallet address (in URL param)
   * - Checks if corresponding salt wallet exists in database
   * - If exists, returns the address
   * - If not, creates wallet using Salt SDK and returns the address
   */
  app.get<{
    Params: { address: string };
    Reply: ApiResponse<{ saltWalletAddress: string }>;
  }>('/wallets/:address', async (request, reply) => {
    const { address } = request.params;

    if (!address) {
      return reply.badRequest('Missing wallet address');
    }

    try {
      // Get or create salt wallet
      const saltWalletAddress = await getOrCreateSaltWallet(
        app.supabase,
        address
      );

      return {
        success: true,
        data: {
          saltWalletAddress,
        },
      };
    } catch (error) {
      console.error('[GET /wallets/:address] Error:', error);
      return reply.internalServerError(
        error instanceof Error ? error.message : 'Failed to get or create salt wallet'
      );
    }
  });

  /**
   * POST /salt/accounts - Create a salt account for a user
   * This uses the getOrCreateSaltWallet function which:
   * 1. Checks if a salt account exists for the user's wallet address
   * 2. Returns existing account if found
   * 3. Creates new salt wallet via Salt SDK and stores in DB if not found
   */
  app.post<{
    Body: { userWalletAddress: string };
    Reply: ApiResponse<{ saltAccountAddress: string; account: SaltAccount }>;
  }>('/accounts', async (request, reply) => {
    const { userWalletAddress } = request.body;

    if (!userWalletAddress) {
      return reply.badRequest('Missing userWalletAddress');
    }

    // Get or create salt wallet (this calls Salt SDK if needed)
    const saltAccountAddress = await getOrCreateSaltWallet(
      app.supabase,
      userWalletAddress
    );

    // Get the account record from database
    const account = await getSaltAccountByWalletAddress(
      app.supabase,
      userWalletAddress
    );

    if (!account) {
      return reply.internalServerError('Failed to retrieve created account');
    }

    return {
      success: true,
      data: {
        saltAccountAddress,
        account,
      },
    };
  });

  /**
   * GET /salt/accounts/:id - Get salt account with policy and strategies
   */
  app.get<{
    Params: { id: string };
    Reply: ApiResponse<AccountWithDetails>;
  }>('/accounts/:id', async (request, reply) => {
    const { id } = request.params;

    const account = await getSaltAccountById(app.supabase, id);
    if (!account) {
      return reply.notFound('Salt account not found');
    }

    const policy = await getLatestPolicy(app.supabase, id);
    const strategies = await getStrategiesByAccountId(app.supabase, id);

    return {
      success: true,
      data: {
        account,
        policy,
        strategies,
      },
    };
  });

  /**
   * POST /salt/accounts/:id/policies - Create or update policy for an account
   */
  app.post<{
    Params: { id: string };
    Body: { policy: SaltPolicyInput };
    Reply: ApiResponse<SaltPolicy>;
  }>('/accounts/:id/policies', async (request, reply) => {
    const { id } = request.params;
    const { policy } = request.body;

    if (!policy) {
      return reply.badRequest('Missing policy');
    }

    // Verify account exists
    const account = await getSaltAccountById(app.supabase, id);
    if (!account) {
      return reply.notFound('Salt account not found');
    }

    // Validate policy
    const errors = validatePolicy(policy);
    if (errors.length > 0) {
      return reply.badRequest(errors.join(', '));
    }

    // Upsert policy
    const savedPolicy = await upsertSaltPolicy(app.supabase, id, {
      maxLeverage: policy.maxLeverage,
      maxDailyNotionalUsd: policy.maxDailyNotionalUsd,
      allowedPairs: policy.allowedPairs,
      maxDrawdownPct: policy.maxDrawdownPct,
    });

    return {
      success: true,
      data: savedPolicy,
    };
  });

  /**
   * POST /salt/accounts/:id/strategies - Add a strategy to an account
   */
  app.post<{
    Params: { id: string };
    Body: CreateStrategyRequest;
    Reply: ApiResponse<SaltStrategy>;
  }>('/accounts/:id/strategies', async (request, reply) => {
    const { id } = request.params;
    const { strategyId, params, active } = request.body;

    if (!strategyId) {
      return reply.badRequest('Missing strategyId');
    }

    // Verify account exists
    const account = await getSaltAccountById(app.supabase, id);
    if (!account) {
      return reply.notFound('Salt account not found');
    }

    // Verify strategy exists
    const strategyDef = getStrategyById(strategyId);
    if (!strategyDef) {
      return reply.badRequest(`Unknown strategy: ${strategyId}`);
    }

    // Merge provided params with defaults
    const mergedParams = {
      ...strategyDef.defaultParams,
      ...params,
    };

    // Create strategy
    const strategy = await createSaltStrategy(app.supabase, id, {
      strategyId,
      params: mergedParams,
      active: active ?? false,
    });

    return {
      success: true,
      data: strategy,
    };
  });

  /**
   * POST /salt/accounts/:id/trade - Execute a trade for a Salt account
   *
   * This endpoint:
   * 1. Validates the user is authenticated with Pear Protocol
   * 2. Validates the trade params via pear-service
   * 3. Checks against the account's policy
   * 4. Executes the trade via pear-service with source='salt'
   */
  app.post<{
    Params: { id: string };
    Body: ExecuteTradeParams;
    Reply: ApiResponse<TradeExecutionResult>;
  }>('/accounts/:id/trade', async (request, reply) => {
    const { id } = request.params;
    const params = request.body;

    // Validate required fields
    if (!params.narrativeId || !params.direction || !params.stakeUsd || !params.riskProfile || !params.mode) {
      return reply.badRequest('Missing required fields: narrativeId, direction, stakeUsd, riskProfile, mode');
    }

    // Validate direction
    if (params.direction !== 'longNarrative' && params.direction !== 'shortNarrative') {
      return reply.badRequest('direction must be "longNarrative" or "shortNarrative"');
    }

    // Validate riskProfile
    if (!['conservative', 'standard', 'degen'].includes(params.riskProfile)) {
      return reply.badRequest('riskProfile must be "conservative", "standard", or "degen"');
    }

    // Validate mode
    if (params.mode !== 'pair' && params.mode !== 'basket') {
      return reply.badRequest('mode must be "pair" or "basket"');
    }

    // Validate stakeUsd
    if (params.stakeUsd < 1) {
      return reply.badRequest('Minimum stake is $1 USD');
    }

    try {
      const result = await executeStrategyTrade(app.supabase, id, params);

      if (!result.success) {
        // Return 400 for policy violations, 401 for auth issues
        if (result.error?.includes('not authenticated')) {
          return reply.unauthorized(result.error);
        }
        if (result.error?.includes('Policy violation')) {
          return reply.code(400).send({
            success: false,
            error: { code: 'POLICY_VIOLATION', message: result.error },
            data: result,
          });
        }
        return reply.badRequest(result.error || 'Trade execution failed');
      }

      return {
        success: true,
        data: result,
      };
    } catch (err) {
      console.error('[POST /accounts/:id/trade] Error:', err);
      return reply.internalServerError(
        err instanceof Error ? err.message : 'Failed to execute trade'
      );
    }
  });

  /**
   * GET /salt/accounts/:id/trades - Get trade history for a Salt account
   */
  app.get<{
    Params: { id: string };
    Reply: ApiResponse<Trade[]>;
  }>('/accounts/:id/trades', async (request, reply) => {
    const { id } = request.params;

    // Verify account exists
    const account = await getSaltAccountById(app.supabase, id);
    if (!account) {
      return reply.notFound('Salt account not found');
    }

    try {
      const trades = await getTradesBySaltAccount(account.salt_account_address);
      return {
        success: true,
        data: trades,
      };
    } catch (err) {
      console.error('[GET /accounts/:id/trades] Error:', err);
      return reply.internalServerError(
        err instanceof Error ? err.message : 'Failed to get trades'
      );
    }
  });

  /**
   * GET /salt/accounts/:id/strategy-runs - Get recent strategy runs for a Salt account
   */
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string };
    Reply: ApiResponse<StrategyRun[]>;
  }>('/accounts/:id/strategy-runs', async (request, reply) => {
    const { id } = request.params;
    const limit = parseInt(request.query.limit || '20', 10);

    // Verify account exists
    const account = await getSaltAccountById(app.supabase, id);
    if (!account) {
      return reply.notFound('Salt account not found');
    }

    try {
      const runs = await getStrategyRunsByAccountId(app.supabase, id, limit);
      return {
        success: true,
        data: runs,
      };
    } catch (err) {
      console.error('[GET /accounts/:id/strategy-runs] Error:', err);
      return reply.internalServerError(
        err instanceof Error ? err.message : 'Failed to get strategy runs'
      );
    }
  });
}
