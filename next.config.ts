import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/warga", permanent: false }];
  },
};

export default nextConfig;
