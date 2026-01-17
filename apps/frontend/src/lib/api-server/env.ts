// Server-side environment configuration
// This file should only be imported in API routes (server context)

export const serverEnv = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Pear Protocol
  PEAR_API_BASE_URL: process.env.PEAR_API_BASE_URL || 'https://hl-v2.pearprotocol.io',
  PEAR_CLIENT_ID: process.env.PEAR_CLIENT_ID || 'HLHackathon10',

  // LI.FI
  LIFI_API_BASE_URL: process.env.LIFI_API_BASE_URL || 'https://li.quest/v1',
  LIFI_INTEGRATOR: process.env.LIFI_INTEGRATOR || 'tago-leap',
  LIFI_API_KEY: process.env.LIFI_API_KEY || '',

  // Anthropic
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // Hyperliquid
  HYPERLIQUID_API_BASE_URL: process.env.HYPERLIQUID_API_BASE_URL || 'https://api.hyperliquid.xyz',
  HYPEREVM_CHAIN_ID: parseInt(process.env.HYPEREVM_CHAIN_ID || '999'),

  // Twitter/X API
  X_BEARER_TOKEN: process.env.X_BEARER_TOKEN || '',
  X_API_KEY: process.env.X_API_KEY || '',
  X_API_SECRET: process.env.X_API_SECRET || '',
  X_CLIENT_ID: process.env.X_CLIENT_ID || '',
  X_CLIENT_SECRET: process.env.X_CLIENT_SECRET || '',
  X_CALLBACK_URL: process.env.X_CALLBACK_URL || '',

  // Cron
  CRON_SECRET: process.env.CRON_SECRET || '',
};

// Validate required env vars
export function validateServerEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter(key => !serverEnv[key as keyof typeof serverEnv]);

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
