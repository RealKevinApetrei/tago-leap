import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import {
  getSupabaseAdmin,
  type SupabaseAdminClient,
} from '@tago-leap/shared/supabase';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseAdminClient;
  }
}

async function supabase(fastify: FastifyInstance) {
  const client = getSupabaseAdmin();
  fastify.decorate('supabase', client);
}

export const supabasePlugin = fp(supabase, {
  name: 'supabase',
});
