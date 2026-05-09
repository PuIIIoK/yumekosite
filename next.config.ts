import type { NextConfig } from "next";
import { createHash } from "crypto";
import path from "path";

function obfuscatedClassName(resourcePath: string, exportName: string, buildId: string): string {
  const salt = process.env.NEXT_CLASSNAME_SALT || buildId;
  const hash = createHash("sha256")
    .update(`${salt}:${resourcePath}:${exportName}`)
    .digest("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 14);
  return `_${hash}`;
}

function patchCssModuleClassNames(rules: unknown[], buildId: string): void {
  for (const rule of rules) {
    if (!rule || typeof rule !== "object") continue;
    const record = rule as Record<string, unknown>;

    if (Array.isArray(record.oneOf)) {
      patchCssModuleClassNames(record.oneOf, buildId);
    }

    const use = record.use;
    if (!Array.isArray(use)) continue;

    for (const item of use) {
      if (!item || typeof item !== "object") continue;
      const loaderItem = item as { loader?: string; options?: { modules?: { getLocalIdent?: unknown } } };
      if (!loaderItem.loader?.includes("css-loader")) continue;
      if (!loaderItem.options?.modules) continue;

      loaderItem.options.modules.getLocalIdent = (context: { resourcePath: string }, _: string, exportName: string) =>
        obfuscatedClassName(context.resourcePath, exportName, buildId);
    }
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  webpack: (config, { buildId, dev }) => {
    const mode = process.env.NEXT_OBFUSCATE_CLASSES;
    const enabled = mode === "true" || (!dev && mode !== "false");

    if (enabled && Array.isArray(config.module?.rules)) {
      patchCssModuleClassNames(config.module.rules, buildId);
    }

    return config;
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
