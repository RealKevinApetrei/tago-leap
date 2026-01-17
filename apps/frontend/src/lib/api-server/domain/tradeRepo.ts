import type { SupabaseAdminClient } from '../supabase';
import type { Trade, TablesInsert, TradeFilters } from '@tago-leap/shared/types';

type TradeInsert = TablesInsert<'trades'>;

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

export async function getTradesByAccountRef(
  supabase: SupabaseAdminClient,
  accountRef: string
): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('account_ref', accountRef)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get trades by account ref: ${error.message}`);
  }

  return data || [];
}

export async function getTradesWithFilters(
  supabase: SupabaseAdminClient,
  filters: TradeFilters
): Promise<Trade[]> {
  let query = supabase.from('trades').select(`
    *,
    users!inner(wallet_address)
  `);

  if (filters.walletAddress) {
    query = query.eq('users.wallet_address', filters.walletAddress.toLowerCase());
  }

  if (filters.accountRef) {
    query = query.eq('account_ref', filters.accountRef);
  }

  if (filters.source) {
    query = query.eq('source', filters.source);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get trades with filters: ${error.message}`);
  }

  return data || [];
}
