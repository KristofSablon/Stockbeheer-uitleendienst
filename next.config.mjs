/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prototype: blokkeer de build niet op lint-waarschuwingen.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
