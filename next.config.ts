import type { NextConfig } from "next";

const nextConfig = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
