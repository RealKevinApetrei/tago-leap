import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type { User } from '@tago-leap/shared/types';

/**
 * Get or create a user by wallet address.
 * Uses upsert to handle race conditions.
 */
export async function getOrCreateUser(
  supabase: SupabaseAdminClient,
  walletAddress: string
): Promise<User> {
  // Normalize wallet address to lowercase
  const normalizedAddress = walletAddress.toLowerCase();

  // Try to upsert the user
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { wallet_address: normalizedAddress },
      { onConflict: 'wallet_address', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to get or create user: ${error.message}`);
  }

  return data;
}
