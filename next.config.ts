import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable X-Powered-By header for security
  poweredByHeader: false,

  // Disable Image Optimization API (only SVGs used, saves Vercel invocations)
  images: {
    unoptimized: true,
  },

  // Enable View Transitions API for smooth page navigations
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
