import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/making": ["./content/*.md", "./PRD-해커톤-베이스캠프.md"],
  },
};

export default nextConfig;
