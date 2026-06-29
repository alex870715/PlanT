import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { searchPlaces } from "@/lib/places/nominatim";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const latRaw = request.nextUrl.searchParams.get("lat");
  const lngRaw = request.nextUrl.searchParams.get("lng");
  const lat = latRaw != null ? Number(latRaw) : undefined;
  const lng = lngRaw != null ? Number(lngRaw) : undefined;

  try {
    const results = await searchPlaces({
      query: q,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      limit: 8,
    });
    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/places/search", error);
    return jsonError("地點搜尋失敗", 500);
  }
}
