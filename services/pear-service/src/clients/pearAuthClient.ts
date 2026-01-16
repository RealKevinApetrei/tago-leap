import { env } from '../config/env.js';
import type { AuthTokens } from '@tago-leap/shared/types';

const PEAR_API_BASE = env.PEAR_API_BASE_URL;
const PEAR_CLIENT_ID = env.PEAR_CLIENT_ID;

/**
 * EIP712 message response from Pear Protocol
 */
export interface PearEIP712Message {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
  timestamp: number;
}

/**
 * Auth response from Pear Protocol
 */
interface PearAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  address: string;
  clientId: string;
}

/**
 * Get the EIP-712 message for wallet authentication.
 * The frontend will sign this message with the user's wallet.
 */
export async function getEIP712Message(walletAddress: string): Promise<PearEIP712Message> {
  const url = `${PEAR_API_BASE}/auth/eip712-message?address=${walletAddress}&clientId=${PEAR_CLIENT_ID}`;

  console.log('[PearAuthClient] Getting EIP712 message:', { url, walletAddress, clientId: PEAR_CLIENT_ID });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Failed to get EIP712 message:', { status: response.status, error });
    throw new Error(`Failed to get EIP-712 message: ${error}`);
  }

  const data = await response.json() as PearEIP712Message;
  console.log('[PearAuthClient] Got EIP712 message with timestamp:', data.timestamp);
  return data;
}

/**
 * Authenticate with Pear Protocol using a signed EIP-712 message.
 * Returns JWT access and refresh tokens.
 */
export async function authenticate(
  walletAddress: string,
  signature: string,
  timestamp: number
): Promise<AuthTokens> {
  const url = `${PEAR_API_BASE}/auth/login`;

  const body = {
    method: 'eip712',
    address: walletAddress,
    clientId: PEAR_CLIENT_ID,
    details: {
      signature,
      timestamp,
    },
  };

  console.log('[PearAuthClient] Authenticating:', { url, address: walletAddress, clientId: PEAR_CLIENT_ID, timestamp });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Authentication failed:', { status: response.status, error });
    throw new Error(`Authentication failed: ${error}`);
  }

  const data = await response.json() as PearAuthResponse;
  console.log('[PearAuthClient] Authentication successful, expiresIn:', data.expiresIn);

  // Calculate expiration times based on expiresIn (seconds)
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + data.expiresIn * 1000);
  // Refresh token: 30 days
  const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

/**
 * Refresh the access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const url = `${PEAR_API_BASE}/auth/refresh`;

  console.log('[PearAuthClient] Refreshing token');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Token refresh failed:', { status: response.status, error });
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json() as {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  };

  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + data.expiresIn * 1000);
  const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

/**
 * Logout and invalidate refresh token.
 */
export async function logout(refreshToken: string): Promise<void> {
  const url = `${PEAR_API_BASE}/auth/logout`;

  console.log('[PearAuthClient] Logging out');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Logout failed:', { status: response.status, error });
    // Don't throw - logout should not fail the flow
  }
}

/**
 * Check if an access token is expired (with 1 minute buffer).
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date();
  const buffer = 60 * 1000; // 1 minute buffer
  return now.getTime() >= expiresAt.getTime() - buffer;
}

/**
 * Agent Wallet response types
 */
export interface AgentWalletStatus {
  exists: boolean;
  agentWalletAddress: string | null;
}

export interface CreateAgentWalletResponse {
  agentWalletAddress: string;
  message: string;
}

/**
 * Get the agent wallet for an authenticated user.
 * Requires a valid access token.
 * Returns null address if no wallet exists (404).
 */
export async function getAgentWallet(accessToken: string): Promise<AgentWalletStatus> {
  const url = `${PEAR_API_BASE}/agentWallet`;

  console.log('[PearAuthClient] Checking agent wallet status');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 404) {
    console.log('[PearAuthClient] No agent wallet found (404)');
    return { exists: false, agentWalletAddress: null };
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Failed to get agent wallet:', { status: response.status, error });
    throw new Error(`Failed to get agent wallet: ${error}`);
  }

  const data = await response.json();
  console.log('[PearAuthClient] Agent wallet response:', JSON.stringify(data));

  // Handle both possible response formats
  const agentAddress = data.agentWalletAddress || data.address || data.agentAddress;

  if (!agentAddress) {
    console.log('[PearAuthClient] No agent wallet in response');
    return { exists: false, agentWalletAddress: null };
  }

  console.log('[PearAuthClient] Agent wallet found:', agentAddress);
  return { exists: true, agentWalletAddress: agentAddress };
}

/**
 * Create a new agent wallet for an authenticated user.
 * Requires a valid access token.
 * After creation, user must approve the wallet on Hyperliquid.
 */
export async function createAgentWallet(accessToken: string): Promise<CreateAgentWalletResponse> {
  const url = `${PEAR_API_BASE}/agentWallet`;

  console.log('[PearAuthClient] Creating agent wallet');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}), // Pear API requires a body with Content-Type: application/json
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PearAuthClient] Failed to create agent wallet:', { status: response.status, error });
    throw new Error(`Failed to create agent wallet: ${error}`);
  }

  const data = await response.json();
  console.log('[PearAuthClient] Agent wallet created response:', JSON.stringify(data));

  const agentAddress = data.agentWalletAddress || data.address || data.agentAddress;
  return {
    agentWalletAddress: agentAddress,
    message: data.message || 'Agent wallet created. Please approve on Hyperliquid.',
  };
}
