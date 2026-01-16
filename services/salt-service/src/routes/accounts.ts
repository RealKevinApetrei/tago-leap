import { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  SaltAccount,
  SaltPolicy,
  SaltStrategy,
  SaltPolicyInput,
  CreateStrategyRequest,
} from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import {
  createSaltAccount,
  getSaltAccountById,
  getSaltAccountByUserId,
  upsertSaltPolicy,
  getLatestPolicy,
  createSaltStrategy,
  getStrategiesByAccountId,
} from '../domain/saltRepo.js';
import { validatePolicy } from '../domain/policyTypes.js';
import { getAllStrategies, getStrategyById } from '../domain/strategyTypes.js';

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
   * POST /salt/accounts - Create a salt account for a user
   */
  app.post<{
    Body: { userWalletAddress: string };
    Reply: ApiResponse<SaltAccount>;
  }>('/accounts', async (request, reply) => {
    const { userWalletAddress } = request.body;

    if (!userWalletAddress) {
      return reply.badRequest('Missing userWalletAddress');
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Check if account already exists
    const existing = await getSaltAccountByUserId(app.supabase, user.id);
    if (existing) {
      return {
        success: true,
        data: existing,
      };
    }

    // Create new salt account
    const account = await createSaltAccount(app.supabase, user.id);

    return {
      success: true,
      data: account,
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
}
