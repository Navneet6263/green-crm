const nextConfig = {
  // Prevent dev-only double effect execution from triggering duplicate client fetches.
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // Shareable link to our sister product GreenHR.
      { source: "/greenhr", destination: "https://www.greenhr.in", permanent: false },
    ];
  },
};

export default nextConfig;
