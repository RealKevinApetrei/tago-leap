import { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  OnboardingFlow,
  OnboardingQuoteRequest,
  SupportedOption,
  LifiRoute,
  Json,
  RoutePreference,
  RouteAlternatives,
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
 * Extended quote request that supports salt wallet destination and preference
 */
interface ExtendedQuoteRequest extends OnboardingQuoteRequest {
  /** If true, deposit destination will be the user's salt wallet */
  depositToSaltWallet?: boolean;
  /** Route optimization preference */
  preference?: RoutePreference;
}

/**
 * Salt wallet response
 */
interface SaltWalletInfo {
  userWalletAddress: string;
  saltWalletAddress: string;
  exists: boolean;
}

/**
 * Quote response with multiple route alternatives
 */
interface QuoteResponse {
  /** The flow ID for tracking */
  id: string;
  /** Flow status */
  status: string | null;
  /** Recommended route based on preference */
  recommended: LifiRoute;
  /** All available route alternatives */
  alternatives: LifiRoute[];
  /** The preference used */
  preference: RoutePreference;
  /** Number of routes available */
  routeCount: number;
  /** Salt wallet address if depositing to salt */
  saltWalletAddress?: string;
}

/**
 * Request to select a specific route
 */
interface SelectRouteRequest {
  flowId: string;
  routeId: string;
}

export async function onboardingRoutes(app: FastifyInstance) {
  /**
   * GET /onboard/salt-wallet/:address - Get or create salt wallet for a user
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
   * POST /onboard/quote - Get route alternatives for onboarding (bridge + deposit)
   *
   * Returns multiple route options sorted by user preference.
   * User can then select a specific route using POST /onboard/select-route
   */
  app.post<{
    Body: ExtendedQuoteRequest;
    Reply: ApiResponse<QuoteResponse>;
  }>('/onboard/quote', async (request, reply) => {
    const {
      userWalletAddress,
      fromChainId,
      fromTokenAddress,
      amount,
      toTokenAddress,
      depositToSaltWallet,
      preference = 'recommended',
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !fromChainId || !fromTokenAddress || !amount || !toTokenAddress) {
      return reply.badRequest('Missing required fields');
    }

    // Validate preference
    const validPreferences: RoutePreference[] = ['recommended', 'fastest', 'cheapest', 'safest'];
    if (!validPreferences.includes(preference)) {
      return reply.badRequest(
        `Invalid preference. Must be one of: ${validPreferences.join(', ')}`
      );
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
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get salt wallet for deposit';
        app.log.error(`Failed to get salt wallet: ${errorMessage}`);
        return reply.internalServerError(errorMessage);
      }
    }

    // Get routes from LI.FI with preference
    let routeAlternatives: RouteAlternatives;
    try {
      routeAlternatives = await getRoutes({
        fromChainId,
        toChainId: hyperliquidConfig.hyperEvmChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount: amount,
        fromAddress: userWalletAddress,
        toAddress: saltWalletAddress || userWalletAddress,
        preference,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get routes from LI.FI';
      app.log.error(`Failed to get routes: ${errorMessage}`);
      return reply.badRequest(errorMessage);
    }

    // Create onboarding flow with the recommended route
    const flow = await createOnboardingFlow(app.supabase, user.id, {
      from_chain_id: fromChainId,
      from_token_address: fromTokenAddress,
      to_token_address: toTokenAddress,
      amount,
      lifi_route: routeAlternatives.recommended as unknown as Json,
      status: 'initiated',
    });

    app.log.info(
      `Created quote with ${routeAlternatives.routeCount} route alternatives (preference: ${preference})`
    );

    return {
      success: true,
      data: {
        id: flow.id,
        status: flow.status,
        recommended: routeAlternatives.recommended,
        alternatives: routeAlternatives.alternatives,
        preference: routeAlternatives.preference,
        routeCount: routeAlternatives.routeCount,
        saltWalletAddress,
      },
    };
  });

  /**
   * POST /onboard/select-route - Select a specific route from alternatives
   *
   * Allows user to choose a different route than the recommended one
   */
  app.post<{
    Body: SelectRouteRequest;
    Reply: ApiResponse<OnboardingFlow>;
  }>('/onboard/select-route', async (request, reply) => {
    const { flowId, routeId } = request.body;

    if (!flowId || !routeId) {
      return reply.badRequest('Missing flowId or routeId');
    }

    // Get the flow
    const flow = await getOnboardingFlowById(app.supabase, flowId);
    if (!flow) {
      return reply.notFound('Onboarding flow not found');
    }

    if (flow.status !== 'initiated') {
      return reply.badRequest('Cannot change route after flow has started');
    }

    // For now, we'll need to re-fetch routes to get the selected one
    // In a production system, you might cache the alternatives
    app.log.info(`Route selection requested for flow ${flowId}, route ${routeId}`);

    // Update the flow to indicate route was confirmed
    const updatedFlow = await updateOnboardingFlow(app.supabase, flowId, {
      status: 'initiated', // Still initiated, ready for execution
    });

    return {
      success: true,
      data: updatedFlow,
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
