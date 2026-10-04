import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // C:\Users\Notebook\package-lock.json ilə qarışmasın deyə layihə kökünü göstəririk
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
