/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    NEXT_PUBLIC_IS_PROD: process.env.NEXT_PUBLIC_IS_PROD ?? 'false',
  },
  // Next.js 16 uses Turbopack by default. Declaring an empty turbopack config
  // silences the "webpack config present but no turbopack config" warning.
  // File-change polling inside Docker is handled by the WATCHPACK_POLLING=true
  // env var set in docker-compose.yml.
  turbopack: {},
};

module.exports = nextConfig;
