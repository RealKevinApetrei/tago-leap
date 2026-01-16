import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import { getOrCreateUser } from './userRepo.js';
import { createSaltAccount, getSaltAccountByWalletAddress } from './saltRepo.js';
import { createSaltWallet } from '../clients/saltSdkClient.js';

/**
 * Get or create a Salt wallet for a user by their wallet address.
 *
 * @param supabase - Supabase admin client
 * @param userWalletAddress - The user's wallet address
 * @returns The Salt wallet address
 *
 * This function:
 * 1. Checks if a salt account exists for the user's wallet address
 * 2. If it exists, returns the salt account address
 * 3. If not, creates a new salt wallet using Salt SDK and stores it in the database
 */
export async function getOrCreateSaltWallet(
  supabase: SupabaseAdminClient,
  userWalletAddress: string
): Promise<string> {
  // Check if salt account already exists for this wallet address
  const existingAccount = await getSaltAccountByWalletAddress(
    supabase,
    userWalletAddress
  );

  if (existingAccount) {
    console.log(`[SaltWalletService] Found existing salt account for ${userWalletAddress}`);
    return existingAccount.salt_account_address;
  }

  // Get or create user first
  const user = await getOrCreateUser(supabase, userWalletAddress);

  // Create new salt wallet using Salt SDK
  console.log(`[SaltWalletService] Creating new salt wallet for ${userWalletAddress}`);
  const saltAccountAddress = await createSaltWallet(userWalletAddress);

  // Store the salt account in the database
  const account = await createSaltAccount(supabase, user.id, saltAccountAddress);

  console.log(`[SaltWalletService] Created salt account ${account.salt_account_address} for user ${user.id}`);

  return account.salt_account_address;
}
