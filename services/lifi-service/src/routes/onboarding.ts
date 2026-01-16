import { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  OnboardingFlow,
  OnboardingQuoteRequest,
  SupportedOption,
  LifiRoute,
  Json,
} from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import {
  createOnboardingFlow,
  getOnboardingFlowById,
  updateOnboardingFlow,
} from '../domain/onboardingRepo.js';
import { getSupportedOptions, getRoutes } from '../clients/lifiClient.js';
import { createDepositRequest } from '../clients/hyperliquidClient.js';
import { hyperliquidConfig } from '../config/hyperliquidConfig.js';

export async function onboardingRoutes(app: FastifyInstance) {
  /**
   * GET /onboard/options - Get supported chains and tokens
   */
  app.get<{
    Reply: ApiResponse<SupportedOption[]>;
  }>('/onboard/options', async () => {
    const options = await getSupportedOptions();
    return {
      success: true,
      data: options,
    };
  });

  /**
   * POST /onboard/quote - Get a quote for onboarding (bridge + deposit)
   */
  app.post<{
    Body: OnboardingQuoteRequest;
    Reply: ApiResponse<OnboardingFlow>;
  }>('/onboard/quote', async (request, reply) => {
    const {
      userWalletAddress,
      fromChainId,
      fromTokenAddress,
      amount,
      toTokenAddress,
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !fromChainId || !fromTokenAddress || !amount || !toTokenAddress) {
      return reply.badRequest('Missing required fields');
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Get route from LI.FI
    const route = await getRoutes({
      fromChainId,
      toChainId: hyperliquidConfig.hyperEvmChainId,
      fromTokenAddress,
      toTokenAddress,
      fromAmount: amount,
    });

    // Create onboarding flow
    const flow = await createOnboardingFlow(app.supabase, user.id, {
      from_chain_id: fromChainId,
      from_token_address: fromTokenAddress,
      to_token_address: toTokenAddress,
      amount,
      lifi_route: route as unknown as Json,
      status: 'initiated',
    });

    return {
      success: true,
      data: flow,
    };
  });

  /**
   * POST /onboard/track - Track transaction hashes for an onboarding flow
   */
  app.post<{
    Body: {
      flowId: string;
      txHashes: string[];
    };
    Reply: ApiResponse<OnboardingFlow>;
  }>('/onboard/track', async (request, reply) => {
    const { flowId, txHashes } = request.body;

    if (!flowId || !txHashes) {
      return reply.badRequest('Missing required fields');
    }

    // Get flow
    const flow = await getOnboardingFlowById(app.supabase, flowId);
    if (!flow) {
      return reply.notFound('Onboarding flow not found');
    }

    // Update with tx hashes
    const updatedFlow = await updateOnboardingFlow(app.supabase, flowId, {
      tx_hashes: txHashes,
      status: 'bridging',
    });

    return {
      success: true,
      data: updatedFlow,
    };
  });

  /**
   * POST /onboard/deposit - Initiate deposit to Hyperliquid
   */
  app.post<{
    Body: {
      flowId: string;
    };
    Reply: ApiResponse<OnboardingFlow>;
  }>('/onboard/deposit', async (request, reply) => {
    const { flowId } = request.body;

    if (!flowId) {
      return reply.badRequest('Missing flowId');
    }

    // Get flow
    const flow = await getOnboardingFlowById(app.supabase, flowId);
    if (!flow) {
      return reply.notFound('Onboarding flow not found');
    }

    if (!flow.user_id) {
      return reply.badRequest('Flow has no associated user');
    }

    // Get user wallet
    const { data: user } = await app.supabase
      .from('users')
      .select('wallet_address')
      .eq('id', flow.user_id)
      .single();

    if (!user) {
      return reply.notFound('User not found');
    }

    // Create deposit request on Hyperliquid
    const depositResponse = await createDepositRequest({
      userWallet: user.wallet_address,
      tokenAddress: flow.to_token_address,
      amount: flow.amount,
    });

    // Update flow status
    const updatedFlow = await updateOnboardingFlow(app.supabase, flowId, {
      status: 'completed',
    });

    app.log.info(`Deposit initiated: ${depositResponse.depositId}`);

    return {
      success: true,
      data: updatedFlow,
    };
  });

  /**
   * GET /onboard/flow/:id - Get onboarding flow by ID
   */
  app.get<{
    Params: { id: string };
    Reply: ApiResponse<OnboardingFlow>;
  }>('/onboard/flow/:id', async (request, reply) => {
    const { id } = request.params;

    const flow = await getOnboardingFlowById(app.supabase, id);

    if (!flow) {
      return reply.notFound('Onboarding flow not found');
    }

    return {
      success: true,
      data: flow,
    };
  });
}
