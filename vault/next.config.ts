import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a subdirectory of the klehomerie-v2 repo, alongside
  // the unrelated Eleventy marketing site (which has its own lockfile at
  // the repo root). Pin the workspace root here so Turbopack doesn't have
  // to guess between the two.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
