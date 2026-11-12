/**
 * Za odwrotnym proxy (Traefik) z inną domeną publiczną niż nagłówek Host dodaj ją
 * do SERVER_ACTIONS_ALLOWED_ORIGINS (lista po przecinku) — Next.js sprawdza Origin akcji.
 */
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '26mb', ...(allowedOrigins.length ? { allowedOrigins } : {}) },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default nextConfig;
