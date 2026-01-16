import { config } from 'dotenv';
import { resolve } from 'path';

// Load root .env file
config({ path: resolve(process.cwd(), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tago-leap/shared'],
};

export default nextConfig;
