/**
 * 以 OSRM（Open Source Routing Machine）取得「沿道路」的距離與時間，
 * 取代直線（haversine）粗估。預設使用公開 demo 伺服器，可用 OSRM_BASE_URL 覆寫。
 *
 * 注意：公開 demo 僅提供 driving profile。為了支援步行/單車/大眾運輸，
 * 我們以 OSRM 取得「真實道路距離」，再依各交通方式的平均速度換算時間；
 * 任何失敗都會退回直線估算（haversine）。
 */

import { haversineKm, type TravelModeId } from "@/lib/travel";

export type RouteEstimate = {
  /** 預估時間（分鐘） */
  minutes: number;
  /** 路線距離（公里） */
  km: number;
  /** osrm = 沿道路；haversine = 直線退回 */
  source: "osrm" | "haversine";
};

const SPEED_KMH: Record<TravelModeId, number> = {
  walk: 4.5,
  transit: 22,
  drive: 35,
  taxi: 30,
  bike: 12,
};

const OSRM_BASE_URL = (
  process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org"
).replace(/\/$/, "");

type CacheEntry = { at: number; estimate: RouteEstimate };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 400;

async function throttle() {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

function minutesFor(km: number, mode: TravelModeId): number {
  const speed = SPEED_KMH[mode] ?? SPEED_KMH.walk;
  return Math.max(1, Math.round((km / speed) * 60));
}

function haversineEstimate(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TravelModeId
): RouteEstimate {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return { km: Math.round(km * 100) / 100, minutes: minutesFor(km, mode), source: "haversine" };
}

type OsrmRouteResponse = {
  code: string;
  routes?: { distance: number; duration: number }[];
};

/** 取得兩點間的路線時間/距離估算（失敗時退回直線） */
export async function estimateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TravelModeId
): Promise<RouteEstimate> {
  if (
    !Number.isFinite(from.lat) ||
    !Number.isFinite(from.lng) ||
    !Number.isFinite(to.lat) ||
    !Number.isFinite(to.lng)
  ) {
    return haversineEstimate(from, to, mode);
  }

  const cacheKey = `${from.lat.toFixed(5)},${from.lng.toFixed(5)};${to.lat.toFixed(5)},${to.lng.toFixed(5)};${mode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.estimate;
  }

  const url = `${OSRM_BASE_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;

  let estimate: RouteEstimate;
  try {
    await throttle();
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new Error("no route");

    const km = route.distance / 1000;
    // driving/taxi 直接採用 OSRM 的行車時間；其他模式以道路距離換算速度。
    const minutes =
      mode === "drive" || mode === "taxi"
        ? Math.max(1, Math.round(route.duration / 60))
        : minutesFor(km, mode);

    estimate = { km: Math.round(km * 100) / 100, minutes, source: "osrm" };
  } catch {
    estimate = haversineEstimate(from, to, mode);
  }

  cache.set(cacheKey, { at: Date.now(), estimate });
  return estimate;
}
