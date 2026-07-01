import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { findTripBySeedCode } from "@/lib/load-trip";
import { prisma } from "@/lib/prisma";
import { buildGeoSchedule } from "@/lib/trip-schedule";
import { serializeSpot } from "@/lib/spot-serializer";
import { serializeTrip } from "@/lib/trip-serializer";
import { partitionSpots } from "@/lib/spots";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = { params: Promise<{ seedCode: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const trip = await findTripBySeedCode(seedCode);

    if (!trip) return jsonError("Trip not found", 404);

    const { trunk } = partitionSpots(
      trip.spots.map((s) => serializeSpot(s))
    );

    if (trunk.length === 0) {
      return jsonError("主幹尚無景點可排程", 400);
    }

    const updates = buildGeoSchedule(
      trunk,
      trip.startDate.toISOString(),
      trip.endDate.toISOString()
    );

    await prisma.$transaction(
      updates.map((u) =>
        prisma.spot.update({
          where: { id: u.id },
          data: {
            scheduledAt: new Date(u.scheduledAt),
            sortOrder: u.sortOrder,
          },
        })
      )
    );

    const updated = await findTripBySeedCode(seedCode);
    if (!updated) return jsonError("Trip not found", 404);

    return NextResponse.json({
      trip: serializeTrip(updated),
      message: `已依 ${updates.length} 個主幹景點、出遊天數與地理位置重新排程`,
    });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/auto-schedule", error);
    return jsonError("Failed to auto-schedule", 500);
  }
}
