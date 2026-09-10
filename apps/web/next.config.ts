import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // shared-types поставляется как TS-исходник, поэтому его компилирует Next
  transpilePackages: ['@expense-tracker/shared-types'],
};

export default nextConfig;
