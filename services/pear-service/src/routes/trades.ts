import { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  Trade,
  Json,
  MarketsResponse,
  GetMarketsParams,
  NarrativeSuggestion,
  SuggestNarrativeRequest,
  ExecuteTradeRequest,
  ExecuteNarrativeTradeRequest,
  ValidateTradeResponse,
  TradeFilters,
  TradeSource,
  PearPosition,
  OrderResponse,
} from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import { createTrade, getTradesByWallet, getTradeById, updateTrade, getTradesWithFilters, getTradesByAccountRef } from '../domain/tradeRepo.js';
import { suggestNarrative, validateModifiedSuggestion } from '../domain/narrativeService.js';
import {
  getMarkets,
  openPosition,
  getPositions,
  closePosition,
} from '../clients/pearClient.js';
import { getAgentWallet } from '../clients/pearAuthClient.js';
import { getValidAccessToken } from '../domain/authRepo.js';
import { getNarrativeById } from '../domain/narratives.js';
import { buildOrderFromSaltRequest, computeNotional, type SaltDirection, type SaltRiskProfile, type SaltMode } from '../domain/betBuilder.js';
import { verifySaltAccountOwnership } from '../domain/saltAccountRepo.js';

export async function tradesRoutes(app: FastifyInstance) {
  /**
   * GET /markets - Get available markets from Pear Protocol
   */
  app.get<{
    Querystring: GetMarketsParams;
    Reply: ApiResponse<MarketsResponse>;
  }>('/markets', async (request) => {
    const markets = await getMarkets(request.query);
    return {
      success: true,
      data: markets,
    };
  });

  /**
   * POST /narratives/suggest - Get AI-powered narrative suggestion
   */
  app.post<{
    Body: SuggestNarrativeRequest;
    Reply: ApiResponse<NarrativeSuggestion>;
  }>('/narratives/suggest', async (request, reply) => {
    const { prompt } = request.body;

    if (!prompt || prompt.trim().length === 0) {
      return reply.badRequest('Prompt is required');
    }

    if (prompt.length > 1000) {
      return reply.badRequest('Prompt must be less than 1000 characters');
    }

    try {
      const suggestion = await suggestNarrative(prompt);
      return {
        success: true,
        data: suggestion,
      };
    } catch (err: any) {
      app.log.error({ err, message: err?.message, stack: err?.stack }, 'Failed to generate narrative suggestion');
      return reply.internalServerError(`Failed to generate suggestion: ${err?.message || 'Unknown error'}`);
    }
  });

  /**
   * POST /narratives/validate - Validate a modified suggestion before execution
   */
  app.post<{
    Body: NarrativeSuggestion;
    Reply: ApiResponse<{ valid: boolean; errors: string[] }>;
  }>('/narratives/validate', async (request) => {
    const validation = await validateModifiedSuggestion(request.body);
    return {
      success: true,
      data: validation,
    };
  });

  /**
   * POST /bets/execute - Execute a trade via Pear Protocol (direct asset execution)
   * Supports Salt integration via accountRef and source fields.
   */
  app.post<{
    Body: ExecuteTradeRequest;
    Reply: ApiResponse<Trade>;
  }>('/bets/execute', async (request, reply) => {
    const {
      userWalletAddress,
      longAssets,
      shortAssets,
      stakeUsd,
      leverage,
      slippage = 0.01,
      accountRef,
      source = 'user',
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !stakeUsd || !leverage) {
      return reply.badRequest('Missing required fields: userWalletAddress, stakeUsd, leverage');
    }

    // Ensure arrays exist (can be empty for directional trades)
    const longAssetsList = longAssets || [];
    const shortAssetsList = shortAssets || [];

    // Must have at least one asset on either side
    if (longAssetsList.length === 0 && shortAssetsList.length === 0) {
      return reply.badRequest('Need at least one asset (long or short) to execute trade');
    }

    if (stakeUsd < 1) {
      return reply.badRequest('Minimum stake is $1 USD');
    }

    if (leverage < 1 || leverage > 100) {
      return reply.badRequest('Leverage must be between 1 and 100');
    }

    // Hyperliquid requires minimum $10 notional per position
    const notional = stakeUsd * leverage;
    const totalAssets = longAssetsList.length + shortAssetsList.length;
    const minNotionalPerAsset = 10;
    const minTotalNotional = Math.max(10, totalAssets * minNotionalPerAsset);

    if (notional < minTotalNotional) {
      return reply.badRequest(
        `Minimum notional not met. Hyperliquid requires ~$10 per position. ` +
        `With ${totalAssets} assets, you need at least $${minTotalNotional} total notional. ` +
        `Your trade: $${notional.toFixed(2)} (${stakeUsd} × ${leverage}x). ` +
        `Increase stake, leverage, or reduce number of assets.`
      );
    }

    // If source is 'salt', require accountRef
    if (source === 'salt' && !accountRef) {
      return reply.badRequest('accountRef is required when source is "salt"');
    }

    // If this is a Salt-driven trade, verify the user owns the Salt account
    if (source === 'salt' && accountRef) {
      const isOwner = await verifySaltAccountOwnership(
        app.supabase,
        accountRef,
        userWalletAddress
      );
      if (!isOwner) {
        return reply.forbidden('User does not own this Salt account');
      }
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Get valid access token (using user's EOA auth)
    const accessToken = await getValidAccessToken(app.supabase, userWalletAddress);
    if (!accessToken) {
      return reply.unauthorized('Authentication required. Please sign in first.');
    }

    // Check agent wallet is set up
    try {
      const agentWalletStatus = await getAgentWallet(accessToken);
      if (!agentWalletStatus.exists) {
        return reply.badRequest(
          'Agent wallet not set up. Please create an agent wallet and approve it on Hyperliquid first. ' +
          'You also need to deposit USDC to Hyperliquid and approve the builder fee.'
        );
      }
    } catch (err) {
      app.log.error(err, 'Failed to check agent wallet status');
      // Continue anyway - the error will be caught when opening position
    }

    // Build the order payload for Pear API
    const orderPayload = {
      slippage,
      executionType: 'MARKET' as const, // Pear API expects uppercase
      leverage,
      usdValue: stakeUsd,
      longAssets: longAssetsList.map(a => ({ asset: a.asset, weight: a.weight })),
      shortAssets: shortAssetsList.map(a => ({ asset: a.asset, weight: a.weight })),
    };

    // Create pending trade record with Salt metadata
    const trade = await createTrade(app.supabase, user.id, {
      narrative_id: 'custom',
      direction: 'long',
      stake_usd: stakeUsd,
      risk_profile: 'moderate',
      mode: 'live',
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
      source,
      account_ref: accountRef ?? null,
    });

    try {
      app.log.info({
        msg: 'Executing trade via Pear API',
        tradeId: trade.id,
        userWallet: userWalletAddress,
        source,
        accountRef,
        orderPayload: {
          leverage: orderPayload.leverage,
          usdValue: orderPayload.usdValue,
          longAssets: orderPayload.longAssets,
          shortAssets: orderPayload.shortAssets,
          slippage: orderPayload.slippage,
          executionType: orderPayload.executionType,
        },
      });

      // Execute trade via Pear API
      const pearResponse = await openPosition(accessToken, orderPayload);

      // Determine success based on response - Pear returns fills array for successful trades
      const isSuccess = pearResponse.fills && pearResponse.fills.length > 0;

      app.log.info({
        msg: isSuccess ? 'Trade executed successfully' : 'Trade executed but no fills',
        tradeId: trade.id,
        fillCount: pearResponse.fills?.length || 0,
        fills: pearResponse.fills,
      });

      // Update trade with response
      const updatedTrade = await updateTrade(app.supabase, trade.id, {
        status: isSuccess ? 'completed' : 'failed',
        pear_response: pearResponse as unknown as Json,
      });

      return {
        success: true,
        data: updatedTrade,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;

      app.log.error({
        msg: 'Trade execution failed',
        tradeId: trade.id,
        userWallet: userWalletAddress,
        source,
        accountRef,
        error: errorMessage,
        stack: errorStack,
        orderPayload: {
          leverage: orderPayload.leverage,
          usdValue: orderPayload.usdValue,
          longAssets: orderPayload.longAssets,
          shortAssets: orderPayload.shortAssets,
        },
      });

      // Update trade as failed
      await updateTrade(app.supabase, trade.id, {
        status: 'failed',
        pear_response: { error: errorMessage },
      });

      // Return the actual error message to help debugging
      return reply.internalServerError(errorMessage || 'Trade execution failed');
    }
  });

  /**
   * POST /bets/execute-narrative - Execute a narrative-based trade (for Salt)
   * Uses narrativeId to resolve assets via betBuilder.
   */
  app.post<{
    Body: ExecuteNarrativeTradeRequest;
    Reply: ApiResponse<Trade>;
  }>('/bets/execute-narrative', async (request, reply) => {
    const {
      userWalletAddress,
      narrativeId,
      direction,
      stakeUsd,
      riskProfile,
      mode,
      accountRef,
      source = accountRef ? 'salt' : 'user',
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !narrativeId || !direction || !stakeUsd || !riskProfile || !mode) {
      return reply.badRequest('Missing required fields');
    }

    if (stakeUsd < 1) {
      return reply.badRequest('Minimum stake is $1 USD');
    }

    // Validate direction
    if (direction !== 'longNarrative' && direction !== 'shortNarrative') {
      return reply.badRequest('direction must be "longNarrative" or "shortNarrative"');
    }

    // Validate riskProfile
    if (!['conservative', 'standard', 'degen'].includes(riskProfile)) {
      return reply.badRequest('riskProfile must be "conservative", "standard", or "degen"');
    }

    // Validate mode
    if (mode !== 'pair' && mode !== 'basket') {
      return reply.badRequest('mode must be "pair" or "basket"');
    }

    // If source is 'salt', require accountRef
    if (source === 'salt' && !accountRef) {
      return reply.badRequest('accountRef is required when source is "salt"');
    }

    // If this is a Salt-driven trade, verify the user owns the Salt account
    if (source === 'salt' && accountRef) {
      const isOwner = await verifySaltAccountOwnership(
        app.supabase,
        accountRef,
        userWalletAddress
      );
      if (!isOwner) {
        return reply.forbidden('User does not own this Salt account');
      }
    }

    // Get narrative by ID
    const narrative = getNarrativeById(narrativeId);
    if (!narrative) {
      return reply.badRequest(`Unknown narrative: ${narrativeId}`);
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Get valid access token (using user's EOA auth)
    const accessToken = await getValidAccessToken(app.supabase, userWalletAddress);
    if (!accessToken) {
      return reply.unauthorized('Authentication required. Please sign in first.');
    }

    // Check agent wallet is set up
    try {
      const agentWalletStatus = await getAgentWallet(accessToken);
      if (!agentWalletStatus.exists) {
        return reply.badRequest(
          'Agent wallet not set up. Please create an agent wallet and approve it on Hyperliquid first. ' +
          'You also need to deposit USDC to Hyperliquid and approve the builder fee.'
        );
      }
    } catch (err) {
      app.log.error(err, 'Failed to check agent wallet status');
      // Continue anyway - the error will be caught when opening position
    }

    // Build the order payload using betBuilder
    const orderPayload = buildOrderFromSaltRequest({
      narrative,
      direction: direction as SaltDirection,
      stakeUsd,
      riskProfile: riskProfile as SaltRiskProfile,
      mode: mode as SaltMode,
    });

    // Create pending trade record with Salt metadata
    const trade = await createTrade(app.supabase, user.id, {
      narrative_id: narrativeId,
      direction: direction === 'longNarrative' ? 'long' : 'short',
      stake_usd: stakeUsd,
      risk_profile: riskProfile,
      mode,
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
      source,
      account_ref: accountRef ?? null,
    });

    try {
      // Execute trade via Pear API
      const pearResponse = await openPosition(accessToken, orderPayload);

      // Determine success based on response - Pear returns fills array for successful trades
      const isSuccess = pearResponse.fills && pearResponse.fills.length > 0;

      // Update trade with response
      const updatedTrade = await updateTrade(app.supabase, trade.id, {
        status: isSuccess ? 'completed' : 'failed',
        pear_response: pearResponse as unknown as Json,
      });

      return {
        success: true,
        data: updatedTrade,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Update trade as failed
      await updateTrade(app.supabase, trade.id, {
        status: 'failed',
        pear_response: { error: errorMessage },
      });

      app.log.error(err, 'Narrative trade execution failed');

      // Return the actual error message to help debugging
      return reply.internalServerError(errorMessage || 'Trade execution failed');
    }
  });

  /**
   * POST /bets/validate - Dry-run validation for narrative trades
   * Returns computed payload without executing, so Salt can pre-check against its policy.
   */
  app.post<{
    Body: ExecuteNarrativeTradeRequest;
    Reply: ApiResponse<ValidateTradeResponse>;
  }>('/bets/validate', async (request, reply) => {
    const {
      narrativeId,
      direction,
      stakeUsd,
      riskProfile,
      mode,
    } = request.body;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!narrativeId) errors.push('narrativeId is required');
    if (!direction) errors.push('direction is required');
    if (!stakeUsd) errors.push('stakeUsd is required');
    if (!riskProfile) errors.push('riskProfile is required');
    if (!mode) errors.push('mode is required');

    if (stakeUsd && stakeUsd < 1) {
      errors.push('Minimum stake is $1 USD');
    }

    // Validate direction
    if (direction && direction !== 'longNarrative' && direction !== 'shortNarrative') {
      errors.push('direction must be "longNarrative" or "shortNarrative"');
    }

    // Validate riskProfile
    if (riskProfile && !['conservative', 'standard', 'degen'].includes(riskProfile)) {
      errors.push('riskProfile must be "conservative", "standard", or "degen"');
    }

    // Validate mode
    if (mode && mode !== 'pair' && mode !== 'basket') {
      errors.push('mode must be "pair" or "basket"');
    }

    // Get narrative by ID
    const narrative = narrativeId ? getNarrativeById(narrativeId) : null;
    if (narrativeId && !narrative) {
      errors.push(`Unknown narrative: ${narrativeId}`);
    }

    if (errors.length > 0) {
      return {
        success: true,
        data: {
          valid: false,
          errors,
          warnings,
        },
      };
    }

    // Build the computed payload
    const orderPayload = buildOrderFromSaltRequest({
      narrative: narrative!,
      direction: direction as SaltDirection,
      stakeUsd,
      riskProfile: riskProfile as SaltRiskProfile,
      mode: mode as SaltMode,
    });

    const estimatedNotional = computeNotional(stakeUsd, orderPayload.leverage);

    // Add warnings for high leverage or large notional
    if (orderPayload.leverage >= 5) {
      warnings.push(`High leverage (${orderPayload.leverage}x) - consider risk carefully`);
    }
    if (estimatedNotional > 10000) {
      warnings.push(`Large notional position ($${estimatedNotional.toFixed(2)})`);
    }

    return {
      success: true,
      data: {
        valid: true,
        errors: [],
        warnings,
        computedPayload: {
          longAssets: orderPayload.longAssets,
          shortAssets: orderPayload.shortAssets,
          leverage: orderPayload.leverage,
          estimatedNotional,
        },
      },
    };
  });

  /**
   * GET /positions - Get open positions for a wallet
   */
  app.get<{
    Querystring: { wallet: string };
    Reply: ApiResponse<PearPosition[]>;
  }>('/positions', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.badRequest('Missing wallet query parameter');
    }

    const accessToken = await getValidAccessToken(app.supabase, wallet);
    if (!accessToken) {
      return reply.unauthorized('Authentication required');
    }

    try {
      const positions = await getPositions(accessToken);
      return {
        success: true,
        data: positions,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;

      app.log.error({
        msg: 'Failed to fetch positions from Pear API',
        wallet,
        error: errorMessage,
        stack: errorStack,
      }, 'Failed to fetch positions');

      // Return actual error message for debugging
      return reply.internalServerError(`Failed to fetch positions: ${errorMessage}`);
    }
  });

  /**
   * POST /positions/:id/close - Close a position
   */
  app.post<{
    Params: { id: string };
    Body: { walletAddress: string };
    Reply: ApiResponse<OrderResponse>;
  }>('/positions/:id/close', async (request, reply) => {
    const { id } = request.params;
    const { walletAddress } = request.body;

    if (!walletAddress) {
      return reply.badRequest('Missing walletAddress');
    }

    const accessToken = await getValidAccessToken(app.supabase, walletAddress);
    if (!accessToken) {
      return reply.unauthorized('Authentication required');
    }

    try {
      const response = await closePosition(accessToken, id);
      return {
        success: true,
        data: response,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      app.log.error({ positionId: id, walletAddress, error: errorMessage }, 'Failed to close position');
      return reply.internalServerError(`Failed to close position: ${errorMessage}`);
    }
  });

  /**
   * GET /trades - Get trades with flexible filters
   * Supports filtering by wallet, accountRef (Salt account), source, and status.
   */
  app.get<{
    Querystring: { wallet?: string; accountRef?: string; source?: TradeSource; status?: string };
    Reply: ApiResponse<Trade[]>;
  }>('/trades', async (request, reply) => {
    const { wallet, accountRef, source, status } = request.query;

    // Require at least one filter
    if (!wallet && !accountRef) {
      return reply.badRequest('Either wallet or accountRef query parameter is required');
    }

    // If only accountRef is provided, use the optimized query
    if (accountRef && !wallet) {
      const trades = await getTradesByAccountRef(app.supabase, accountRef);
      return {
        success: true,
        data: trades,
      };
    }

    // Use flexible filters
    const filters: TradeFilters = {
      walletAddress: wallet,
      accountRef,
      source,
      status,
    };

    const trades = await getTradesWithFilters(app.supabase, filters);

    return {
      success: true,
      data: trades,
    };
  });

  /**
   * GET /trades/:id - Get a specific trade by ID
   */
  app.get<{
    Params: { id: string };
    Reply: ApiResponse<Trade>;
  }>('/trades/:id', async (request, reply) => {
    const { id } = request.params;

    const trade = await getTradeById(app.supabase, id);

    if (!trade) {
      return reply.notFound('Trade not found');
    }

    return {
      success: true,
      data: trade,
    };
  });
}
