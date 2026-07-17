/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prototype: blokkeer de build niet op lint-waarschuwingen.
    ignoreDuringBuilds: true,
  },
  // Sta cross-origin dev-verzoeken toe vanuit online omgevingen (GitHub Codespaces,
  // Gitpod). Zonder dit blokkeert Next.js de formulieracties (bv. aanmelden) omdat
  // het proxy-adres niet overeenkomt met de interne host.
  allowedDevOrigins: ["*.app.github.dev", "*.githubpreview.dev", "*.gitpod.io"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.app.github.dev",
        "*.githubpreview.dev",
        "*.gitpod.io",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
