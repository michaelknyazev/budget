import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@budget/schemas'],
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
};

export default nextConfig;
