/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    QB_CLIENT_ID: process.env.QB_CLIENT_ID,
    QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET,
    QB_REDIRECT_URI: process.env.QB_REDIRECT_URI,
  },
}

export default nextConfig 