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
import { getOrCreateSaltWallet } from '../clients/saltServiceClient.js';

/**
 * Extended quote request that supports salt wallet destination
 */
interface ExtendedQuoteRequest extends OnboardingQuoteRequest {
  /** If true, deposit destination will be the user's salt wallet */
  depositToSaltWallet?: boolean;
}

/**
 * Salt wallet response
 */
interface SaltWalletInfo {
  userWalletAddress: string;
  saltWalletAddress: string;
  exists: boolean;
}

export async function onboardingRoutes(app: FastifyInstance) {
  /**
   * GET /onboard/salt-wallet/:address - Get or create salt wallet for a user
   *
   * This endpoint integrates with salt-service to:
   * 1. Check if a salt wallet exists for the user
   * 2. Create one if it doesn't exist
   * 3. Return the salt wallet address for deposit destination
   */
  app.get<{
    Params: { address: string };
    Reply: ApiResponse<SaltWalletInfo>;
  }>('/onboard/salt-wallet/:address', async (request, reply) => {
    const { address } = request.params;

    if (!address) {
      return reply.badRequest('Missing wallet address');
    }

    try {
      const saltWalletAddress = await getOrCreateSaltWallet(address);

      return {
        success: true,
        data: {
          userWalletAddress: address,
          saltWalletAddress,
          exists: true,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get salt wallet';
      app.log.error(`Failed to get salt wallet for ${address}: ${errorMessage}`);
      return reply.internalServerError(errorMessage);
    }
  });

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
   *
   * Supports two deposit destinations:
   * 1. Direct to user wallet on HyperEVM (default)
   * 2. To user's salt wallet (when depositToSaltWallet: true)
   */
  app.post<{
    Body: ExtendedQuoteRequest;
    Reply: ApiResponse<OnboardingFlow & { saltWalletAddress?: string }>;
  }>('/onboard/quote', async (request, reply) => {
    const {
      userWalletAddress,
      fromChainId,
      fromTokenAddress,
      amount,
      toTokenAddress,
      depositToSaltWallet,
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !fromChainId || !fromTokenAddress || !amount || !toTokenAddress) {
      return reply.badRequest('Missing required fields');
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // If depositing to salt wallet, get/create the salt wallet address
    let saltWalletAddress: string | undefined;
    if (depositToSaltWallet) {
      try {
        saltWalletAddress = await getOrCreateSaltWallet(userWalletAddress);
        app.log.info(`Using salt wallet ${saltWalletAddress} as deposit destination`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get salt wallet for deposit';
        app.log.error(`Failed to get salt wallet: ${errorMessage}`);
        return reply.internalServerError(errorMessage);
      }
    }

    // Get route from LI.FI
    // The destination address is either the salt wallet or user wallet
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
      data: {
        ...flow,
        saltWalletAddress,
      },
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
