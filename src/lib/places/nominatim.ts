/**
 * 以 OpenStreetMap Nominatim 提供真實地點搜尋（免 API key）。
 * 使用規範：須帶 User-Agent、每秒最多 1 次請求。
 * 這裡加上記憶體快取與最小間隔節流，避免被封鎖。
 */

export type PlaceResult = {
  /** 來源唯一 id（osm_type + osm_id） */
  id: string;
  name: string;
  /** 次要說明（地址或分類） */
  description: string;
  latitude: number;
  longitude: number;
  category: "food" | "spot";
  /** 行政區或地址片段 */
  area?: string;
  source: "osm";
};

type NominatimItem = {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PlanT/1.0 (group travel planner; https://github.com/alex870715/PlanT)";

const cache = new Map<string, { at: number; results: PlaceResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

async function throttle() {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

const FOOD_CLASSES = new Set(["amenity", "shop"]);
const FOOD_TYPES = new Set([
  "restaurant",
  "cafe",
  "fast_food",
  "food_court",
  "bar",
  "pub",
  "bakery",
  "ice_cream",
  "confectionery",
  "deli",
]);

function classifyCategory(item: NominatimItem): "food" | "spot" {
  const type = item.type ?? "";
  const klass = item.class ?? "";
  if (FOOD_TYPES.has(type)) return "food";
  if (klass === "amenity" && FOOD_CLASSES.has(klass) && FOOD_TYPES.has(type)) {
    return "food";
  }
  return "spot";
}

function pickName(item: NominatimItem): string {
  if (item.name?.trim()) return item.name.trim();
  const display = item.display_name ?? "";
  return display.split(",")[0]?.trim() || display;
}

function pickArea(item: NominatimItem): string | undefined {
  const a = item.address ?? {};
  return (
    a.suburb ||
    a.neighbourhood ||
    a.city_district ||
    a.city ||
    a.town ||
    a.county ||
    a.state ||
    undefined
  );
}

function shortDescription(item: NominatimItem): string {
  const parts = (item.display_name ?? "").split(",").map((s) => s.trim());
  return parts.slice(1, 3).join(" · ") || parts[0] || "";
}

export async function searchPlaces(options: {
  query: string;
  lat?: number;
  lng?: number;
  limit?: number;
}): Promise<PlaceResult[]> {
  const query = options.query.trim();
  if (query.length < 2) return [];

  const limit = Math.min(Math.max(options.limit ?? 8, 1), 15);
  const cacheKey = `${query.toLowerCase()}|${options.lat?.toFixed(2) ?? ""}|${options.lng?.toFixed(2) ?? ""}|${limit}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results;
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "0",
    limit: String(limit),
    "accept-language": "zh-TW,zh,ja,en",
  });

  // 以使用者所在點為中心建立 viewbox，提高在地相關性（不強制邊界）
  if (options.lat != null && options.lng != null) {
    const d = 0.5;
    const left = options.lng - d;
    const right = options.lng + d;
    const top = options.lat + d;
    const bottom = options.lat - d;
    params.set("viewbox", `${left},${top},${right},${bottom}`);
    params.set("bounded", "0");
  }

  await throttle();

  let res: Response;
  try {
    res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "zh-TW,zh,ja,en",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return [];
  }

  if (!res.ok) return [];

  let data: NominatimItem[];
  try {
    data = (await res.json()) as NominatimItem[];
  } catch {
    return [];
  }

  const results: PlaceResult[] = data
    .filter((item) => item.lat && item.lon)
    .map((item) => ({
      id: `osm-${item.osm_type ?? "n"}-${item.osm_id ?? Math.random()}`,
      name: pickName(item),
      description: shortDescription(item),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      category: classifyCategory(item),
      area: pickArea(item),
      source: "osm" as const,
    }))
    .filter(
      (r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)
    );

  cache.set(cacheKey, { at: Date.now(), results });
  return results;
}
