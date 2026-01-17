import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tago-leap/shared'],
  // Allow external images for chain/token logos
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'app.hyperliquid.xyz' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'static.debank.com' },
      { protocol: 'https', hostname: '**.lifi.tools' },
    ],
  },
  // Skip type checking during build (done in CI separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize for Vercel
  experimental: {
    optimizePackageImports: ['recharts', '@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
  // Handle external packages that cause issues
  webpack: (config, { isServer }) => {
    // Add alias for shared package to ensure it resolves correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tago-leap/shared/types': path.resolve(__dirname, '../../packages/shared/dist/types/index.js'),
      '@tago-leap/shared/env': path.resolve(__dirname, '../../packages/shared/dist/env/index.js'),
      '@tago-leap/shared/supabase': path.resolve(__dirname, '../../packages/shared/dist/supabase/index.js'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
