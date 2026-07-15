import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { findTripBySeedCode } from "@/lib/load-trip";
import { prisma } from "@/lib/prisma";
import {
  buildTripHandbookInputFromTrip,
  generateTripHandbook,
} from "@/lib/trip-handbook";
import {
  getTripHandbookBySeedCode,
  saveTripHandbookForTripId,
  updateTripHandbook,
} from "@/lib/save-trip-handbook";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = { params: Promise<{ seedCode: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    let handbook = await getTripHandbookBySeedCode(seedCode);

    if (!handbook) {
      const trip = await prisma.trip.findUnique({
        where: { seedCode },
        select: { id: true },
      });
      if (!trip) return jsonError("Trip not found", 404);

      const saved = await saveTripHandbookForTripId(trip.id);
      if (saved) {
        handbook = saved;
      } else {
        const full = await findTripBySeedCode(seedCode);
        if (!full) return jsonError("Trip not found", 404);
        const content = await generateTripHandbook(
          buildTripHandbookInputFromTrip(full)
        );
        return NextResponse.json({
          seedCode,
          ...content,
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ephemeral: true,
        });
      }
    }

    return NextResponse.json({ seedCode, ...handbook });
  } catch (error) {
    console.error("GET /api/trip/[seedCode]/handbook", error);
    return jsonError("Failed to fetch trip handbook", 500);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const handbook = await saveTripHandbookForTripId(trip.id);
    if (!handbook) return jsonError("無法生成導覽手冊", 500);

    return NextResponse.json({ seedCode, ...handbook });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/handbook", error);
    return jsonError("Failed to regenerate trip handbook", 500);
  }
}

/** 儲存手動編輯過的童話旅冊內容 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const body = await request.json().catch(() => ({}));
    const purpose = typeof body.purpose === "string" ? body.purpose : undefined;
    const slides = Array.isArray(body.slides) ? body.slides : undefined;
    const anchorLodging =
      typeof body.anchorLodging === "boolean" ? body.anchorLodging : undefined;
    const regenerate = body.regenerate === true;

    if (
      !purpose &&
      !slides &&
      anchorLodging === undefined
    ) {
      return jsonError("請提供 purpose、slides 或 anchorLodging", 400);
    }

    if (anchorLodging !== undefined && regenerate) {
      const handbook = await saveTripHandbookForTripId(trip.id, {
        anchorLodging,
      });
      if (!handbook) return jsonError("無法更新旅遊手冊", 500);
      return NextResponse.json({ seedCode, ...handbook });
    }

    if (anchorLodging !== undefined) {
      const handbook = await updateTripHandbook(trip.id, { anchorLodging });
      if (!handbook) return jsonError("無法儲存設定", 500);
      return NextResponse.json({ seedCode, ...handbook });
    }

    const handbook = await updateTripHandbook(trip.id, { purpose, slides });
    if (!handbook) return jsonError("無法儲存旅遊手冊", 500);

    return NextResponse.json({ seedCode, ...handbook });
  } catch (error) {
    console.error("PATCH /api/trip/[seedCode]/handbook", error);
    return jsonError("Failed to save trip handbook", 500);
  }
}
