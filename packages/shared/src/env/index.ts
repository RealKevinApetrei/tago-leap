import { z } from 'zod';

// Base environment schema (shared across all services)
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

// Pear service environment schema
export const pearEnvSchema = baseEnvSchema.extend({
  PEAR_SERVICE_PORT: z.coerce.number().default(3001),
  PEAR_API_BASE_URL: z.string().url().default('https://hl-v2.pearprotocol.io'),
  ANTHROPIC_API_KEY: z.string().min(1),
});

// LI.FI service environment schema
export const lifiEnvSchema = baseEnvSchema.extend({
  LIFI_SERVICE_PORT: z.coerce.number().default(3002),
  LIFI_API_BASE_URL: z.string().url().default('https://li.quest/v1'),
  LIFI_INTEGRATOR: z.string().default('tago-leap'),
  HYPERLIQUID_API_BASE_URL: z.string().url().default('https://api.hyperliquid.xyz'),
  HYPEREVM_CHAIN_ID: z.coerce.number().default(999),
  SALT_SERVICE_URL: z.string().url().default('http://localhost:3003'),
});

// Salt service environment schema
export const saltEnvSchema = baseEnvSchema.extend({
  SALT_SERVICE_PORT: z.coerce.number().default(3003),
  PEAR_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  // Salt SDK configuration (uses SIWER authentication, no API keys)
  SALT_ENVIRONMENT: z.enum(['TESTNET', 'PRODUCTION']).default('TESTNET'),
  SALT_MNEMONIC: z.string().optional(),
  SALT_RPC_URL: z.string().url().optional(),
});

// Frontend environment schema (public vars)
export const frontendEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PEAR_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_LIFI_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  NEXT_PUBLIC_SALT_SERVICE_URL: z.string().url().default('http://localhost:3003'),
});

// Type exports
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type PearEnv = z.infer<typeof pearEnvSchema>;
export type LifiEnv = z.infer<typeof lifiEnvSchema>;
export type SaltEnv = z.infer<typeof saltEnvSchema>;
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

/**
 * Validates environment variables against a Zod schema.
 * Throws an error with detailed formatting if validation fails.
 */
export function validateEnv<T extends z.ZodSchema>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env
): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}
