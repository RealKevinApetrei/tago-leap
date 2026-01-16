import { FastifyInstance } from 'fastify';
import type { ApiResponse, EIP712Message, AuthenticatePayload } from '@tago-leap/shared/types';
import { getEIP712Message, authenticate } from '../clients/pearAuthClient.js';
import { saveAuthTokens, getAuthTokens, deleteAuthTokens } from '../domain/authRepo.js';
import { getOrCreateUser } from '../domain/userRepo.js';

export async function authRoutes(app: FastifyInstance) {
  /**
   * GET /auth/message - Get EIP-712 message for wallet signing
   */
  app.get<{
    Querystring: { wallet: string };
    Reply: ApiResponse<EIP712Message>;
  }>('/auth/message', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.badRequest('Missing wallet query parameter');
    }

    try {
      const message = await getEIP712Message(wallet);
      return {
        success: true,
        data: message,
      };
    } catch (err) {
      app.log.error(err, 'Failed to get EIP-712 message');
      return reply.internalServerError('Failed to get authentication message');
    }
  });

  /**
   * POST /auth/verify - Submit signature and store JWT tokens
   */
  app.post<{
    Body: AuthenticatePayload;
    Reply: ApiResponse<{ authenticated: boolean }>;
  }>('/auth/verify', async (request, reply) => {
    const { walletAddress, signature, message } = request.body;

    if (!walletAddress || !signature || !message) {
      return reply.badRequest('Missing required fields: walletAddress, signature, message');
    }

    try {
      // Get or create user first
      const user = await getOrCreateUser(app.supabase, walletAddress);

      // Authenticate with Pear Protocol
      const tokens = await authenticate(walletAddress, signature, message);

      // Save tokens to database
      await saveAuthTokens(app.supabase, user.id, walletAddress, tokens);

      return {
        success: true,
        data: { authenticated: true },
      };
    } catch (err) {
      app.log.error(err, 'Authentication failed');
      return reply.unauthorized('Authentication failed');
    }
  });

  /**
   * GET /auth/status - Check if wallet has valid authentication
   */
  app.get<{
    Querystring: { wallet: string };
    Reply: ApiResponse<{ authenticated: boolean; expiresAt?: string }>;
  }>('/auth/status', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.badRequest('Missing wallet query parameter');
    }

    const tokens = await getAuthTokens(app.supabase, wallet);

    if (!tokens) {
      return {
        success: true,
        data: { authenticated: false },
      };
    }

    const expiresAt = new Date(tokens.access_token_expires_at);
    const isExpired = new Date() >= expiresAt;

    return {
      success: true,
      data: {
        authenticated: !isExpired,
        expiresAt: tokens.access_token_expires_at,
      },
    };
  });

  /**
   * POST /auth/logout - Clear authentication tokens
   */
  app.post<{
    Body: { walletAddress: string };
    Reply: ApiResponse<{ loggedOut: boolean }>;
  }>('/auth/logout', async (request, reply) => {
    const { walletAddress } = request.body;

    if (!walletAddress) {
      return reply.badRequest('Missing walletAddress');
    }

    await deleteAuthTokens(app.supabase, walletAddress);

    return {
      success: true,
      data: { loggedOut: true },
    };
  });
}
