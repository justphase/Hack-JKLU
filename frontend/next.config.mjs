/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* calls to the backend
  // In production (Vercel), set BACKEND_URL env var to your deployed backend URL
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3002";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Skip type errors during Vercel build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
