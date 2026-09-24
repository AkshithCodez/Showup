import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@showup/shared'],
  reactStrictMode: true,
};

export default nextConfig;
