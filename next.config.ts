import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
    proxyClientMaxBodySize: "27mb",
    serverActions: {
      bodySizeLimit: "27mb",
    },
  },
};

export default nextConfig;
