// All API routes are now consolidated in Next.js API routes
// No external service URLs needed - everything runs on /api/*
export const config = {
  pearServiceUrl: '/api/pear',
  lifiServiceUrl: '/api/lifi',
  saltServiceUrl: '/api/salt',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};
