import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["pdf-parse", "nodemailer"],
  // Turbopack has a CSS path resolution bug on Windows — use webpack
  bundlePagesRouterDependencies: true,

  // Redirigir www → dominio raíz (bueno para SEO)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.serendipity.vn' }],
        destination: 'https://serendipity.vn/:path*',
        permanent: true,
      },
    ]
  },

  // Headers de seguridad básicos
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
