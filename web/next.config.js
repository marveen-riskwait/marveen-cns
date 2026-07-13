/** @type {import('next').NextConfig} */
const API = process.env.CMS_API_URL || "http://localhost:3001";

const nextConfig = {
  reactStrictMode: true,
  // Public content can change at any time; we fetch with no-store in lib/api.
  //
  // Serve uploaded media from this site's own origin: the browser requests
  // /media/... on the public site and Next proxies it to the backend. Keeps
  // image URLs working behind a proxy / in Codespaces, and in production.
  async rewrites() {
    return [
      { source: "/media/:path*", destination: `${API}/media/:path*` },
    ];
  },
};

module.exports = nextConfig;
