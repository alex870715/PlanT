import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 避免上層 sideproject/package-lock 被當成 workspace root，導致 build 找不到 route
  outputFileTracingRoot: projectRoot,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "zh.wikipedia.org" },
      { protocol: "https", hostname: "en.wikipedia.org" },
      { protocol: "https", hostname: "ja.wikipedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "live.staticflickr.com" },
      { protocol: "https", hostname: "**.openverse.org" },
    ],
  },
};

export default nextConfig;
