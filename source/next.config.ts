import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        // Send every www request to the canonical non-www host with a permanent (308) redirect,
        // so Google stops crawling duplicate www copies of each page.
        source: "/:path*",
        has: [{ type: "host", value: "www.autoopulence.co.uk" }],
        destination: "https://autoopulence.co.uk/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
