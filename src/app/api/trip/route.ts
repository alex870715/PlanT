import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createTripWithDefaults } from "@/lib/load-trip";
import { generateUniqueSeedCode } from "@/lib/seed-code";
import { serializeTrip } from "@/lib/trip-serializer";
import { createTripSchema, parseBody } from "@/lib/validation";
import { autoLinkHostOnTripCreate } from "@/lib/trip-access";
import { getSessionUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, createTripSchema);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const body = parsed.data;

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return jsonError("Invalid date format", 400);
    }
    if (endDate < startDate) {
      return jsonError("endDate must be on or after startDate", 400);
    }

    const seedCode = await generateUniqueSeedCode();
    const memberName = body.memberName?.trim() || "Explorer";

    const trip = await createTripWithDefaults({
      seedCode,
      title: body.title.trim(),
      startDate,
      endDate,
      memberName,
    });

    const user = await getSessionUser();
    if (user?.id) {
      await autoLinkHostOnTripCreate({
        tripId: trip.id,
        userId: user.id,
        userEmail: user.email,
      });
      const refreshed = await import("@/lib/load-trip").then((m) =>
        m.findTripById(trip.id)
      );
      if (refreshed) {
        return NextResponse.json(serializeTrip(refreshed), { status: 201 });
      }
    }

    return NextResponse.json(serializeTrip(trip), { status: 201 });
  } catch (error) {
    console.error("POST /api/trip", error);
    return jsonError("Failed to create trip", 500);
  }
}
