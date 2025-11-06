/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false, // 🚫 Desactiva Turbopack
  },
  reactStrictMode: true,
}

module.exports = nextConfig
