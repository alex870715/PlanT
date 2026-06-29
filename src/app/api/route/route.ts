import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { estimateRoute } from "@/lib/routing/osrm";
import { clientIp, rateLimit, sweepRateLimitBuckets } from "@/lib/rate-limit";
import { TRAVEL_MODES, type TravelModeId } from "@/lib/travel";

const VALID_MODES = new Set(TRAVEL_MODES.map((m) => m.id));

function num(value: string | null): number {
  return value == null ? NaN : Number(value);
}

export async function GET(request: NextRequest) {
  sweepRateLimitBuckets();

  const limited = rateLimit(`route:${clientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return jsonError("查詢太頻繁，請稍後再試", 429);
  }

  const { searchParams } = new URL(request.url);
  const fromLat = num(searchParams.get("fromLat"));
  const fromLng = num(searchParams.get("fromLng"));
  const toLat = num(searchParams.get("toLat"));
  const toLng = num(searchParams.get("toLng"));
  const mode = (searchParams.get("mode") ?? "walk") as TravelModeId;

  if (
    !Number.isFinite(fromLat) ||
    !Number.isFinite(fromLng) ||
    !Number.isFinite(toLat) ||
    !Number.isFinite(toLng)
  ) {
    return jsonError("缺少有效的座標", 400);
  }
  if (!VALID_MODES.has(mode)) {
    return jsonError("不支援的交通方式", 400);
  }

  const estimate = await estimateRoute(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
    mode
  );

  return NextResponse.json(estimate, {
    headers: { "Cache-Control": "public, max-age=600" },
  });
}
