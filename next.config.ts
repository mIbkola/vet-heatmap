import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/vet-heatmap" : "";
const assetPrefix = isProd ? "/vet-heatmap/" : undefined;

const nextConfig: NextConfig = {
  // output: "export" — only for GitHub Pages, but blocks `next start` for local dev
  // GitHub Actions builds with NEXT_OUTPUT=export env, see deploy.yml
  images: { unoptimized: true },
  transpilePackages: ["maplibre-gl"],
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
