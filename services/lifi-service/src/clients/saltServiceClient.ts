import { env } from '../config/env.js';
import type { ApiResponse } from '@tago-leap/shared/types';

interface SaltWalletResponse {
  saltWalletAddress: string;
}

const SALT_SERVICE_URL = env.SALT_SERVICE_URL ?? 'http://localhost:3003';

/**
 * Get or create a salt wallet for a user by their wallet address.
 * Calls the salt-service to check if a salt wallet exists, and creates one if not.
 *
 * @param userWalletAddress - The user's connected wallet address
 * @returns The salt wallet address
 */
export async function getOrCreateSaltWallet(
  userWalletAddress: string
): Promise<string> {
  const url = `${SALT_SERVICE_URL}/salt/wallets/${userWalletAddress}`;

  console.log(`[SaltServiceClient] Getting salt wallet for ${userWalletAddress}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get salt wallet: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ApiResponse<SaltWalletResponse>;

  if (!data.success || !data.data?.saltWalletAddress) {
    throw new Error('Invalid response from salt service');
  }

  console.log(`[SaltServiceClient] Salt wallet: ${data.data.saltWalletAddress}`);

  return data.data.saltWalletAddress;
}

/**
 * Check if a salt wallet exists for a user (without creating one).
 *
 * @param userWalletAddress - The user's connected wallet address
 * @returns The salt wallet address if it exists, null otherwise
 */
export async function checkSaltWallet(
  userWalletAddress: string
): Promise<string | null> {
  try {
    return await getOrCreateSaltWallet(userWalletAddress);
  } catch (error) {
    console.log(`[SaltServiceClient] No salt wallet found for ${userWalletAddress}`);
    return null;
  }
}
