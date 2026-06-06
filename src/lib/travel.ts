export const TRAVEL_MODES = [
  { id: "walk", label: "步行", emoji: "🚶" },
  { id: "transit", label: "大眾運輸", emoji: "🚇" },
  { id: "drive", label: "開車", emoji: "🚗" },
  { id: "taxi", label: "計程車", emoji: "🚕" },
  { id: "bike", label: "腳踏車", emoji: "🚲" },
] as const;

export type TravelModeId = (typeof TRAVEL_MODES)[number]["id"];

const SPEED_KMH: Record<TravelModeId, number> = {
  walk: 4.5,
  transit: 22,
  drive: 35,
  taxi: 30,
  bike: 12,
};

export function travelModeLabel(mode: string | null | undefined): string {
  if (!mode) return "";
  const found = TRAVEL_MODES.find((m) => m.id === mode);
  return found ? `${found.emoji} ${found.label}` : mode;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 依直線距離粗估交通時間（分鐘） */
export function estimateTravelMinutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelModeId
): number {
  const km = haversineKm(fromLat, fromLng, toLat, toLng);
  const speed = SPEED_KMH[mode] ?? SPEED_KMH.walk;
  return Math.max(1, Math.round((km / speed) * 60));
}

export function formatTravelLeg(
  mode: string | null | undefined,
  minutes: number | null | undefined
): string | null {
  if (!mode || minutes == null || minutes <= 0) return null;
  return `${travelModeLabel(mode)} · 約 ${minutes} 分`;
}
