/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright + `baseURL` use 127.0.0.1 while `next dev` prints localhost — allow HMR in that setup.
  allowedDevOrigins: ['127.0.0.1'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    NEXT_PUBLIC_IS_PROD: process.env.NEXT_PUBLIC_IS_PROD ?? 'false',
  },
  // Next.js 16 uses Turbopack by default. Declaring an empty turbopack config
  // silences the "webpack config present but no turbopack config" warning.
  // File-change polling inside Docker is handled by the WATCHPACK_POLLING=true
  // env var set in docker-compose.yml.
  turbopack: {},
  async headers() {
    return [
      {
        source: '/demo/knapsack-product-demo-en.vtt',
        headers: [{ key: 'Content-Type', value: 'text/vtt; charset=utf-8' }],
      },
    ];
  },
};

module.exports = nextConfig;
