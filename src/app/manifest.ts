import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlanT — Plant Your Next Journey",
    short_name: "PlanT",
    description:
      "和朋友一起規劃旅程：滑卡探索、地圖排程、記帳分帳與 AI 故事書。",
    start_url: "/",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#059669",
    lang: "zh-TW",
    orientation: "portrait",
    categories: ["travel", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
