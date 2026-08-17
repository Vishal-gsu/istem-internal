import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required since you are hosting inside the /sync/ folder
  basePath: '/sync',

  // Allow the phone IP to access dev server without CORS/security blocks
  allowedDevOrigins: ['192.168.1.138'],
  
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
