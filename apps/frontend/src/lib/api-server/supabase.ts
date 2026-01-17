import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@tago-leap/shared/types';
import { serverEnv } from './env';

export type SupabaseAdminClient = SupabaseClient<Database>;

let supabaseAdmin: SupabaseAdminClient | null = null;

/**
 * Gets a singleton Supabase admin client with service_role privileges.
 * This client bypasses RLS - use only in server-side API routes.
 */
export function getSupabaseAdmin(): SupabaseAdminClient {
  if (!supabaseAdmin) {
    const url = serverEnv.SUPABASE_URL;
    const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }

    supabaseAdmin = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseAdmin;
}
