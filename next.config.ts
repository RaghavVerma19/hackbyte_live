import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
