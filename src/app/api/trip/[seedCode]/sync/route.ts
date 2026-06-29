import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ seedCode: string }> };

/** 輕量同步：比對 updatedAt，有變更時回傳 true */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const since = request.nextUrl.searchParams.get("since");
    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { updatedAt: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const updatedAt = trip.updatedAt.toISOString();
    const changed =
      !since || new Date(since).getTime() < trip.updatedAt.getTime();

    return NextResponse.json({ updatedAt, changed });
  } catch (error) {
    console.error("GET /api/trip/[seedCode]/sync", error);
    return jsonError("Failed to check sync", 500);
  }
}
