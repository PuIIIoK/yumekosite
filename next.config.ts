import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
