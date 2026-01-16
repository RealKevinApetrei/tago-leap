export const config = {
  pearServiceUrl: process.env.NEXT_PUBLIC_PEAR_SERVICE_URL || 'http://localhost:3001',
  lifiServiceUrl: process.env.NEXT_PUBLIC_LIFI_SERVICE_URL || 'http://localhost:3002',
  saltServiceUrl: process.env.NEXT_PUBLIC_SALT_SERVICE_URL || 'http://localhost:3003',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};
