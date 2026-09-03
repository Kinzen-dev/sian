import type { NextConfig } from "next";

// Vercel serves prerendered pages from its CDN with no export flag.
// SIAN_STATIC_EXPORT=1 is only for the temporary GitHub Pages preview.
const staticExport = process.env.SIAN_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: staticExport ? "export" : undefined,
  basePath: staticExport && process.env.SIAN_BASE_PATH ? process.env.SIAN_BASE_PATH : undefined,
  images: { unoptimized: true },
  trailingSlash: staticExport,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
