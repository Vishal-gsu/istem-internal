import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required since you are hosting inside the /sync/ folder (configurable)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/sync_new',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8004';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
