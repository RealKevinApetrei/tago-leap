import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@tago-leap/shared/types';
import type { AuthTokens } from '@tago-leap/shared/types';
import { refreshAccessToken, isTokenExpired } from '../clients/pearAuthClient';

interface StoredToken {
  id: string;
  user_id: string;
  wallet_address: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export async function getAuthTokens(
  supabase: SupabaseClient<Database>,
  walletAddress: string
): Promise<StoredToken | null> {
  const { data, error } = await supabase
    .from('pear_auth_tokens')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return data as StoredToken;
}

export async function saveAuthTokens(
  supabase: SupabaseClient<Database>,
  userId: string,
  walletAddress: string,
  tokens: AuthTokens
): Promise<void> {
  const { error } = await supabase
    .from('pear_auth_tokens')
    .upsert({
      user_id: userId,
      wallet_address: walletAddress.toLowerCase(),
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
      refresh_token_expires_at: tokens.refreshTokenExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'wallet_address',
    });

  if (error) {
    throw new Error(`Failed to save auth tokens: ${error.message}`);
  }
}

export async function deleteAuthTokens(
  supabase: SupabaseClient<Database>,
  walletAddress: string
): Promise<void> {
  const { error } = await supabase
    .from('pear_auth_tokens')
    .delete()
    .eq('wallet_address', walletAddress.toLowerCase());

  if (error) {
    throw new Error(`Failed to delete auth tokens: ${error.message}`);
  }
}

export async function getValidAccessToken(
  supabase: SupabaseClient<Database>,
  walletAddress: string
): Promise<string | null> {
  console.log('[authRepo] Getting valid access token for:', walletAddress);

  const stored = await getAuthTokens(supabase, walletAddress);

  if (!stored) {
    console.log('[authRepo] No stored tokens found');
    return null;
  }

  const accessExpiresAt = new Date(stored.access_token_expires_at);
  const refreshExpiresAt = new Date(stored.refresh_token_expires_at);

  console.log('[authRepo] Token status:', {
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    accessExpired: isTokenExpired(accessExpiresAt),
    refreshExpired: isTokenExpired(refreshExpiresAt),
  });

  if (isTokenExpired(refreshExpiresAt)) {
    console.log('[authRepo] Refresh token expired - need to re-authenticate');
    await deleteAuthTokens(supabase, walletAddress);
    return null;
  }

  if (isTokenExpired(accessExpiresAt)) {
    console.log('[authRepo] Access token expired - attempting refresh');
    try {
      const newTokens = await refreshAccessToken(stored.refresh_token);
      console.log('[authRepo] Token refresh successful');
      await saveAuthTokens(supabase, stored.user_id, walletAddress, newTokens);
      return newTokens.accessToken;
    } catch (err) {
      console.error('[authRepo] Token refresh failed:', err);
      await deleteAuthTokens(supabase, walletAddress);
      return null;
    }
  }

  console.log('[authRepo] Using existing valid access token');
  return stored.access_token;
}
