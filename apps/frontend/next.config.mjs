/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tago-leap/shared'],
  // Skip type checking during build (done in CI separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize for Vercel
  experimental: {
    optimizePackageImports: ['recharts', '@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
};

export default nextConfig;
