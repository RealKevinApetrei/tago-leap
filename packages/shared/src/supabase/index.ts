import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

export type SupabaseAdminClient = SupabaseClient<Database>;

let supabaseAdmin: SupabaseAdminClient | null = null;

/**
 * Creates a Supabase admin client with service_role privileges.
 * This client bypasses RLS - use only in server-side contexts.
 */
export function createSupabaseAdmin(
  supabaseUrl: string,
  serviceRoleKey: string
): SupabaseAdminClient {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Gets a singleton Supabase admin client.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export function getSupabaseAdmin(): SupabaseAdminClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }

    supabaseAdmin = createSupabaseAdmin(url, key);
  }

  return supabaseAdmin;
}

// Re-export for convenience
export { createClient } from '@supabase/supabase-js';
export type { SupabaseClient } from '@supabase/supabase-js';
