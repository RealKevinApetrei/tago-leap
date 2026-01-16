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
  PearPosition,
  OrderResponse,
} from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import { createTrade, getTradesByWallet, getTradeById, updateTrade } from '../domain/tradeRepo.js';
import { suggestNarrative, validateModifiedSuggestion } from '../domain/narrativeService.js';
import {
  getMarkets,
  openPosition,
  getPositions,
  closePosition,
} from '../clients/pearClient.js';
import { getValidAccessToken } from '../domain/authRepo.js';

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
   * POST /bets/execute - Execute a trade via Pear Protocol
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
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !longAssets || !shortAssets || !stakeUsd || !leverage) {
      return reply.badRequest('Missing required fields');
    }

    if (stakeUsd < 1) {
      return reply.badRequest('Minimum stake is $1 USD');
    }

    if (leverage < 1 || leverage > 100) {
      return reply.badRequest('Leverage must be between 1 and 100');
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Get valid access token
    const accessToken = await getValidAccessToken(app.supabase, userWalletAddress);
    if (!accessToken) {
      return reply.unauthorized('Authentication required. Please sign in first.');
    }

    // Build the order payload for Pear API
    const orderPayload = {
      slippage,
      executionType: 'market' as const,
      leverage,
      usdValue: stakeUsd,
      longAssets: longAssets.map(a => ({ asset: a.asset, weight: a.weight })),
      shortAssets: shortAssets.map(a => ({ asset: a.asset, weight: a.weight })),
    };

    // Create pending trade record
    const trade = await createTrade(app.supabase, user.id, {
      narrative_id: 'custom',
      direction: 'long',
      stake_usd: stakeUsd,
      risk_profile: 'moderate',
      mode: 'live',
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
    });

    try {
      // Execute trade via Pear API
      const pearResponse = await openPosition(accessToken, orderPayload);

      // Update trade with response
      const updatedTrade = await updateTrade(app.supabase, trade.id, {
        status: pearResponse.status === 'filled' ? 'completed' : 'failed',
        pear_response: pearResponse as unknown as Json,
      });

      return {
        success: true,
        data: updatedTrade,
      };
    } catch (err) {
      // Update trade as failed
      await updateTrade(app.supabase, trade.id, {
        status: 'failed',
        pear_response: { error: String(err) },
      });

      app.log.error(err, 'Trade execution failed');
      return reply.internalServerError('Trade execution failed');
    }
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
      app.log.error(err, 'Failed to fetch positions');
      return reply.internalServerError('Failed to fetch positions');
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
      app.log.error(err, 'Failed to close position');
      return reply.internalServerError('Failed to close position');
    }
  });

  /**
   * GET /trades - Get trades by wallet address
   */
  app.get<{
    Querystring: { wallet?: string };
    Reply: ApiResponse<Trade[]>;
  }>('/trades', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.badRequest('Missing wallet query parameter');
    }

    const trades = await getTradesByWallet(app.supabase, wallet);

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
