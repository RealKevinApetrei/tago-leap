import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type { Trade, TablesInsert } from '@tago-leap/shared/types';

type TradeInsert = TablesInsert<'trades'>;

/**
 * Create a new trade record.
 */
export async function createTrade(
  supabase: SupabaseAdminClient,
  userId: string,
  data: Omit<TradeInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<Trade> {
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create trade: ${error.message}`);
  }

  return trade;
}

/**
 * Get trades by wallet address.
 */
export async function getTradesByWallet(
  supabase: SupabaseAdminClient,
  walletAddress: string
): Promise<Trade[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('trades')
    .select(`
      *,
      users!inner(wallet_address)
    `)
    .eq('users.wallet_address', normalizedAddress)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get trades: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a trade by ID.
 */
export async function getTradeById(
  supabase: SupabaseAdminClient,
  tradeId: string
): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('trades')
    .select()
    .eq('id', tradeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get trade: ${error.message}`);
  }

  return data;
}

/**
 * Update trade status and response.
 */
export async function updateTrade(
  supabase: SupabaseAdminClient,
  tradeId: string,
  updates: Partial<Pick<Trade, 'status' | 'pear_response'>>
): Promise<Trade> {
  const { data, error } = await supabase
    .from('trades')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update trade: ${error.message}`);
  }

  return data;
}
