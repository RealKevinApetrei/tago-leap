import type { SupabaseAdminClient } from '@tago-leap/shared/supabase';
import type { OnboardingFlow, TablesInsert, LifiRoute, Json } from '@tago-leap/shared/types';

type OnboardingFlowInsert = TablesInsert<'onboarding_flows'>;

/**
 * Create a new onboarding flow.
 */
export async function createOnboardingFlow(
  supabase: SupabaseAdminClient,
  userId: string,
  data: Omit<OnboardingFlowInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<OnboardingFlow> {
  const { data: flow, error } = await supabase
    .from('onboarding_flows')
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create onboarding flow: ${error.message}`);
  }

  return flow;
}

/**
 * Get an onboarding flow by ID.
 */
export async function getOnboardingFlowById(
  supabase: SupabaseAdminClient,
  flowId: string
): Promise<OnboardingFlow | null> {
  const { data, error } = await supabase
    .from('onboarding_flows')
    .select()
    .eq('id', flowId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get onboarding flow: ${error.message}`);
  }

  return data;
}

/**
 * Update an onboarding flow.
 */
export async function updateOnboardingFlow(
  supabase: SupabaseAdminClient,
  flowId: string,
  updates: {
    status?: string;
    tx_hashes?: string[];
    lifi_route?: LifiRoute;
  }
): Promise<OnboardingFlow> {
  const { data, error } = await supabase
    .from('onboarding_flows')
    .update({
      ...updates,
      tx_hashes: updates.tx_hashes as unknown as Json,
      lifi_route: updates.lifi_route as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update onboarding flow: ${error.message}`);
  }

  return data;
}

/**
 * Get onboarding flows by user wallet.
 */
export async function getOnboardingFlowsByWallet(
  supabase: SupabaseAdminClient,
  walletAddress: string
): Promise<OnboardingFlow[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('onboarding_flows')
    .select(`
      *,
      users!inner(wallet_address)
    `)
    .eq('users.wallet_address', normalizedAddress)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get onboarding flows: ${error.message}`);
  }

  return data || [];
}
