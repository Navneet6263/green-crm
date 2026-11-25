// Protective headers on every page. The CSP only sets rules that cannot break the app
// (no framing, no plugins, no <base> tricks); scripts and styles are not restricted here.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
];

const nextConfig = {
  // Prevent dev-only double effect execution from triggering duplicate client fetches.
  reactStrictMode: false,
  poweredByHeader: false,
  // Never publish readable source code next to the production bundles.
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // Shareable link to our sister product GreenHR.
      { source: "/greenhr", destination: "https://www.greenhr.in", permanent: false },
    ];
  },
};

export default nextConfig;
