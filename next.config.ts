import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["pdf-parse", "nodemailer", "pg"],

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

  // Proxy Sofia backend — evita CORS browser → localhost:5001
  async rewrites() {
    return [
      {
        source: '/sofia-api/:path*',
        destination: 'http://localhost:5001/:path*',
      },
      {
        source: '/sofia-daemon/:path*',
        destination: 'http://localhost:5050/:path*',
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
