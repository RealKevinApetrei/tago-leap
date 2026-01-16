import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';

/**
 * Verify that a user owns a Salt account.
 * Used to validate that trades with source='salt' are authorized.
 */
export async function verifySaltAccountOwnership(
  supabase: SupabaseAdminClient,
  saltAccountAddress: string,
  userWalletAddress: string
): Promise<boolean> {
  const normalizedUserAddress = userWalletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('salt_accounts')
    .select('*, users!inner(wallet_address)')
    .eq('salt_account_address', saltAccountAddress)
    .eq('users.wallet_address', normalizedUserAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not an error, just means no match)
    throw new Error(`Failed to verify Salt account ownership: ${error.message}`);
  }

  return !!data;
}

/**
 * Get Salt account by address.
 */
export async function getSaltAccountByAddress(
  supabase: SupabaseAdminClient,
  saltAccountAddress: string
) {
  const { data, error } = await supabase
    .from('salt_accounts')
    .select('*')
    .eq('salt_account_address', saltAccountAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get Salt account: ${error.message}`);
  }

  return data;
}
