const nextConfig = {
  // Prevent dev-only double effect execution from triggering duplicate client fetches.
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
