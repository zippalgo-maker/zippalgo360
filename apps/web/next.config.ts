import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/zipisa", destination: "/zipservice", permanent: true },
      { source: "/zipcheongso", destination: "/zipservice", permanent: true },
    ];
  },
};

export default nextConfig;
