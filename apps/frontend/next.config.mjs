/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tago-leap/shared'],
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
