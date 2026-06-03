/**
 * 景點照片（免費、可合法嵌入）
 * - 非 Instagram：Meta 不提供一般第三方 App 依地點抓 IG 貼文圖的 API
 * - 來源：Wikipedia、Wikimedia Commons、Openverse (CC)、可選 Unsplash
 */

export type PlacePhoto = {
  url: string;
  credit: string;
  source: "wikipedia" | "commons" | "openverse" | "unsplash";
};

const UA =
  "PlanT/1.0 (group travel planner; https://github.com/alex870715/PlanT)";

function cleanPlaceQuery(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/（.*?）/g, "")
    .split(/[·&｜|]/)[0]
    .trim();
}

function dedupePhotos(photos: PlacePhoto[], limit: number): PlacePhoto[] {
  const seen = new Set<string>();
  const out: PlacePhoto[] = [];
  for (const p of photos) {
    const key = p.url.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchWikipediaPhoto(query: string): Promise<PlacePhoto | null> {
  const tries = [cleanPlaceQuery(query), query.trim()];

  for (const lang of ["zh", "ja", "en"]) {
    for (const title of tries) {
      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          {
            headers: { "User-Agent": UA },
            next: { revalidate: 86400 },
          }
        );
        if (!res.ok) continue;
        const data = (await res.json()) as {
          thumbnail?: { source: string };
          originalimage?: { source: string };
          title?: string;
        };
        const url =
          data.thumbnail?.source ?? data.originalimage?.source ?? null;
        if (url) {
          return {
            url,
            credit: `Wikipedia (${lang}) · ${data.title ?? title}`,
            source: "wikipedia",
          };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function fetchCommonsPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: `file:${query}`,
      gsrlimit: String(Math.min(limit, 8)),
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "960",
    });
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { title?: string; imageinfo?: { thumburl?: string; url?: string }[] }
        >;
      };
    };
    const pages = data.query?.pages ?? {};
    const photos: PlacePhoto[] = [];
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl ?? info?.url;
      if (!url) continue;
      photos.push({
        url,
        credit: `Wikimedia Commons · ${page.title ?? query}`,
        source: "commons",
      });
    }
    return photos;
  } catch {
    return [];
  }
}

async function fetchOpenversePhotos(
  query: string,
  limit: number
): Promise<PlacePhoto[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      page_size: String(Math.min(limit, 8)),
      license: "cc0,pdm,by,by-sa",
    });
    const res = await fetch(
      `https://api.openverse.org/v1/images/?${params}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 43200 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        url?: string;
        creator?: string;
        source?: string;
        foreign_landing_url?: string;
      }[];
    };
    return (data.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        url: r.url!,
        credit: [
          r.creator ? `© ${r.creator}` : null,
          r.source ?? "Openverse",
          "CC 授權",
        ]
          .filter(Boolean)
          .join(" · "),
        source: "openverse" as const,
      }));
  } catch {
    return [];
  }
}

async function fetchUnsplashPhotos(
  query: string,
  limit: number
): Promise<PlacePhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(Math.min(limit, 6)),
      orientation: "landscape",
    });
    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        next: { revalidate: 43200 },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        urls?: { regular?: string };
        user?: { name?: string };
        links?: { html?: string };
      }[];
    };
    return (data.results ?? [])
      .filter((r) => r.urls?.regular)
      .map((r) => ({
        url: r.urls!.regular!,
        credit: `Unsplash · ${r.user?.name ?? "contributor"}`,
        source: "unsplash" as const,
      }));
  } catch {
    return [];
  }
}

/** 依景點名稱與座標取得多張參考圖（社群熱門風格由 CC 圖庫模擬，非 IG 爬蟲） */
export async function fetchPlacePhotos(
  spotName: string,
  _latitude: number,
  _longitude: number,
  limit = 6
): Promise<PlacePhoto[]> {
  const query = cleanPlaceQuery(spotName) || spotName;
  const collected: PlacePhoto[] = [];

  const wiki = await fetchWikipediaPhoto(query);
  if (wiki) collected.push(wiki);

  const [commons, openverse, unsplash] = await Promise.all([
    fetchCommonsPhotos(query, limit),
    fetchOpenversePhotos(query, limit),
    fetchUnsplashPhotos(query, limit),
  ]);

  collected.push(...commons, ...openverse, ...unsplash);

  return dedupePhotos(collected, limit);
}
