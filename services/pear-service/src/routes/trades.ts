import { FastifyInstance } from 'fastify';
import type { BetExecutionRequest, ApiResponse, Trade, Narrative, Json } from '@tago-leap/shared/types';
import { getOrCreateUser } from '../domain/userRepo.js';
import { createTrade, getTradesByWallet, getTradeById, updateTrade } from '../domain/tradeRepo.js';
import { getNarrativeById, getAllNarratives } from '../domain/narratives.js';
import { buildOrderFromBet } from '../domain/betBuilder.js';
import { executePairTrade } from '../clients/pearClient.js';

export async function tradesRoutes(app: FastifyInstance) {
  /**
   * GET /narratives - Get all available narratives
   */
  app.get<{
    Reply: ApiResponse<Narrative[]>;
  }>('/narratives', async () => {
    const narratives = getAllNarratives();
    return {
      success: true,
      data: narratives,
    };
  });

  /**
   * POST /bets/execute - Execute a narrative bet
   */
  app.post<{
    Body: BetExecutionRequest;
    Reply: ApiResponse<Trade>;
  }>('/bets/execute', async (request, reply) => {
    const {
      userWalletAddress,
      narrativeId,
      direction,
      stakeUsd,
      riskProfile,
      mode,
    } = request.body;

    // Validate required fields
    if (!userWalletAddress || !narrativeId || !direction || !stakeUsd || !riskProfile || !mode) {
      return reply.badRequest('Missing required fields');
    }

    // Get or create user
    const user = await getOrCreateUser(app.supabase, userWalletAddress);

    // Load narrative
    const narrative = getNarrativeById(narrativeId);
    if (!narrative) {
      return reply.notFound(`Narrative not found: ${narrativeId}`);
    }

    // Build order payload
    const orderPayload = buildOrderFromBet({
      narrative,
      direction,
      stakeUsd,
      riskProfile,
      mode,
    });

    // Create pending trade record
    const trade = await createTrade(app.supabase, user.id, {
      narrative_id: narrativeId,
      direction,
      stake_usd: stakeUsd,
      risk_profile: riskProfile,
      mode,
      pear_order_payload: orderPayload as unknown as Json,
      status: 'pending',
    });

    try {
      // Execute trade via Pear client (stub)
      const pearResponse = await executePairTrade(orderPayload);

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

      throw err;
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
