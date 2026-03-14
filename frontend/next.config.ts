import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* calls to the Fastify backend during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3002/api/:path*",
      },
    ];
  },
};

export default nextConfig;


