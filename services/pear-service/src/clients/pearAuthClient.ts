import { env } from '../config/env.js';
import type { EIP712Message, AuthTokens } from '@tago-leap/shared/types';

const PEAR_API_BASE = env.PEAR_API_BASE_URL;

/**
 * Get the EIP-712 message for wallet authentication.
 * The frontend will sign this message with the user's wallet.
 */
export async function getEIP712Message(walletAddress: string): Promise<EIP712Message> {
  const response = await fetch(`${PEAR_API_BASE}/eip712?wallet=${walletAddress}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get EIP-712 message: ${error}`);
  }

  const data = await response.json() as EIP712Message;
  return data;
}

/**
 * Authenticate with Pear Protocol using a signed EIP-712 message.
 * Returns JWT access and refresh tokens.
 */
export async function authenticate(
  walletAddress: string,
  signature: string,
  message: EIP712Message
): Promise<AuthTokens> {
  const response = await fetch(`${PEAR_API_BASE}/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet: walletAddress,
      signature,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${error}`);
  }

  const data = await response.json() as { accessToken: string; refreshToken: string };

  // Parse token expiration times
  // Access token: 15 minutes, Refresh token: 30 days
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
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
  const response = await fetch(`${PEAR_API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json() as { accessToken: string; refreshToken?: string };

  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

/**
 * Check if an access token is expired (with 1 minute buffer).
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date();
  const buffer = 60 * 1000; // 1 minute buffer
  return now.getTime() >= expiresAt.getTime() - buffer;
}
