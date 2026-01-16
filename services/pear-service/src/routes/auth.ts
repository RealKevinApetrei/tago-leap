import { FastifyInstance } from 'fastify';
import type { ApiResponse, EIP712Message, AuthenticatePayload } from '@tago-leap/shared/types';
import {
  getEIP712Message,
  authenticate,
  logout as pearLogout,
  getAgentWallet,
  createAgentWallet,
  type AgentWalletStatus,
  type CreateAgentWalletResponse,
} from '../clients/pearAuthClient.js';
import { saveAuthTokens, getAuthTokens, deleteAuthTokens, getValidAccessToken } from '../domain/authRepo.js';
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
    const { walletAddress, signature, timestamp } = request.body;

    if (!walletAddress || !signature || !timestamp) {
      return reply.badRequest('Missing required fields: walletAddress, signature, timestamp');
    }

    try {
      // Get or create user first
      const user = await getOrCreateUser(app.supabase, walletAddress);

      // Authenticate with Pear Protocol
      const tokens = await authenticate(walletAddress, signature, timestamp);

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

    // Try to logout from Pear (invalidate refresh token)
    const tokens = await getAuthTokens(app.supabase, walletAddress);
    if (tokens?.refresh_token) {
      await pearLogout(tokens.refresh_token);
    }

    // Delete from our database
    await deleteAuthTokens(app.supabase, walletAddress);

    return {
      success: true,
      data: { loggedOut: true },
    };
  });

  /**
   * GET /auth/agent-wallet - Check if user has an agent wallet
   */
  app.get<{
    Querystring: { wallet: string };
    Reply: ApiResponse<AgentWalletStatus>;
  }>('/auth/agent-wallet', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.badRequest('Missing wallet query parameter');
    }

    // Get valid access token (auto-refresh if needed)
    const accessToken = await getValidAccessToken(app.supabase, wallet);
    if (!accessToken) {
      return reply.unauthorized('User not authenticated with Pear Protocol');
    }

    try {
      const status = await getAgentWallet(accessToken);
      return {
        success: true,
        data: status,
      };
    } catch (err) {
      app.log.error(err, 'Failed to get agent wallet status');
      return reply.internalServerError('Failed to get agent wallet status');
    }
  });

  /**
   * POST /auth/agent-wallet - Create an agent wallet for the user
   * After creation, user must approve the wallet on Hyperliquid
   */
  app.post<{
    Body: { walletAddress: string };
    Reply: ApiResponse<CreateAgentWalletResponse>;
  }>('/auth/agent-wallet', async (request, reply) => {
    const { walletAddress } = request.body;

    if (!walletAddress) {
      return reply.badRequest('Missing walletAddress');
    }

    // Get valid access token (auto-refresh if needed)
    const accessToken = await getValidAccessToken(app.supabase, walletAddress);
    if (!accessToken) {
      return reply.unauthorized('User not authenticated with Pear Protocol');
    }

    try {
      const result = await createAgentWallet(accessToken);
      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      app.log.error({ err, walletAddress }, 'Failed to create agent wallet');
      // Return the actual error message from Pear
      return {
        success: false,
        error: {
          code: 'AGENT_WALLET_ERROR',
          message: err?.message || 'Failed to create agent wallet',
        },
      };
    }
  });
}
