import { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@tago-leap/shared/types';
import { getAllNarratives, getNarrativeById } from '../domain/narratives.js';
import {
  calculateNarrativePerformance,
  type NarrativePerformance,
} from '../clients/coingeckoClient.js';

export async function narrativesRoutes(app: FastifyInstance) {
  /**
   * GET /narratives - Get all available narratives
   */
  app.get<{
    Reply: ApiResponse<ReturnType<typeof getAllNarratives>>;
  }>('/narratives', async () => {
    return {
      success: true,
      data: getAllNarratives(),
    };
  });

  /**
   * GET /narratives/:id - Get a specific narrative
   */
  app.get<{
    Params: { id: string };
    Reply: ApiResponse<ReturnType<typeof getNarrativeById>>;
  }>('/narratives/:id', async (request, reply) => {
    const { id } = request.params;
    const narrative = getNarrativeById(id);

    if (!narrative) {
      return reply.notFound(`Narrative not found: ${id}`);
    }

    return {
      success: true,
      data: narrative,
    };
  });

  /**
   * GET /narratives/:id/performance - Get historical performance for a narrative
   * Query params:
   *   - days: number of days (default 180)
   */
  app.get<{
    Params: { id: string };
    Querystring: { days?: string };
    Reply: ApiResponse<NarrativePerformance>;
  }>('/narratives/:id/performance', async (request, reply) => {
    const { id } = request.params;
    const days = parseInt(request.query.days || '180', 10);

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return reply.badRequest('Days must be between 1 and 365');
    }

    const narrative = getNarrativeById(id);

    if (!narrative) {
      return reply.notFound(`Narrative not found: ${id}`);
    }

    try {
      const performance = await calculateNarrativePerformance(
        id,
        narrative.longAsset,
        narrative.shortAsset,
        days
      );

      return {
        success: true,
        data: performance,
      };
    } catch (err: any) {
      app.log.error(err, `Failed to calculate performance for narrative: ${id}`);
      const message = err?.message || 'Failed to fetch historical performance data';
      if (message.includes('not found on CoinGecko') || message.includes('Unknown asset')) {
        return reply.badRequest(message);
      }
      return reply.internalServerError(message);
    }
  });

  /**
   * GET /narratives/custom/performance - Get performance for custom long/short pair
   * Query params:
   *   - long: long asset symbol (e.g., FET)
   *   - short: short asset symbol (e.g., ETH)
   *   - days: number of days (default 180)
   */
  app.get<{
    Querystring: { long: string; short: string; days?: string };
    Reply: ApiResponse<NarrativePerformance>;
  }>('/narratives/custom/performance', async (request, reply) => {
    const { long, short, days: daysStr } = request.query;
    const days = parseInt(daysStr || '180', 10);

    if (!long || !short) {
      return reply.badRequest('Both long and short asset symbols are required');
    }

    if (isNaN(days) || days < 1 || days > 365) {
      return reply.badRequest('Days must be between 1 and 365');
    }

    const longAsset = long.toUpperCase();
    const shortAsset = short.toUpperCase();

    try {
      const performance = await calculateNarrativePerformance(
        `custom-${longAsset}-${shortAsset}`,
        longAsset,
        shortAsset,
        days
      );

      return {
        success: true,
        data: performance,
      };
    } catch (err: any) {
      app.log.error(err, `Failed to calculate performance for ${longAsset} vs ${shortAsset}`);
      const message = err?.message || 'Failed to fetch historical performance data';
      // If it's a token not found error, return 400, otherwise 500
      if (message.includes('not found on CoinGecko') || message.includes('Unknown asset')) {
        return reply.badRequest(message);
      }
      return reply.internalServerError(message);
    }
  });
}
