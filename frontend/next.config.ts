import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use static export for deployment in Docker with FastAPI
  output: 'export',
  // Enable React strict mode for development
  reactStrictMode: true,
  // Optimize images
  images: {
    unoptimized: true, // Disable Next.js Image Optimization for static export
  },
  // Ensure TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // Disable trailing slash for consistency
  trailingSlash: false,
};

export default nextConfig;
