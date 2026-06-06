import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createTripWithDefaults } from "@/lib/load-trip";
import { generateUniqueSeedCode } from "@/lib/seed-code";
import { serializeTrip } from "@/lib/trip-serializer";
import type { CreateTripBody } from "@/types/trip";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTripBody;

    if (!body.title?.trim()) {
      return jsonError("title is required", 400);
    }
    if (!body.startDate || !body.endDate) {
      return jsonError("startDate and endDate are required", 400);
    }

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

    return NextResponse.json(serializeTrip(trip), { status: 201 });
  } catch (error) {
    console.error("POST /api/trip", error);
    return jsonError("Failed to create trip", 500);
  }
}
