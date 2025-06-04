/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_QB_CLIENT_ID: process.env.QB_CLIENT_ID,
    NEXT_PUBLIC_QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET,
    NEXT_PUBLIC_QB_REDIRECT_URI: process.env.QB_REDIRECT_URI,
  },
}

export default nextConfig 