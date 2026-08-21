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
  // Optioneel insluiten in SharePoint-pagina's: zet FRAME_ANCESTORS naar bv.
  // "https://gemeente.sharepoint.com" om de app in een iframe toe te laten.
  // Zonder deze variabele wordt er geen frame-beleid gezet (standaardgedrag).
  async headers() {
    const ancestors = process.env.FRAME_ANCESTORS;
    if (!ancestors) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${ancestors}` },
        ],
      },
    ];
  },
};

export default nextConfig;
