import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "anilibria.top" },
      { protocol: "https", hostname: "shikimori.one" },
      { protocol: "https", hostname: "desu.shikimori.one" },
      { protocol: "https", hostname: "media.myshows.me" },
    ],
  },
};

export default nextConfig;
