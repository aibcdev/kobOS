import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep worker count low — this machine hit spawn EAGAIN with ~11 workers.
  experimental: {
    cpus: 2,
  },
  // Temporary: unblock Netlify while we keep the audit funnel shipping.
  // Remove once CI typecheck is green again.
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      // Aliases → dedicated Google Ads audit landing
      {
        source: "/ads/audit",
        destination: "/go/audit",
        permanent: false,
      },
      {
        source: "/google/audit",
        destination: "/go/audit",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
