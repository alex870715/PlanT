import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { findTripBySeedCode } from "@/lib/load-trip";
import { prisma } from "@/lib/prisma";
import { isSupportedCurrency } from "@/lib/currency";
import { serializeTrip } from "@/lib/trip-serializer";
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

    const trip = await findTripBySeedCode(seedCode);

    if (!trip) {
      return jsonError("Trip not found", 404);
    }

    return NextResponse.json(serializeTrip(trip));
  } catch (error) {
    console.error("GET /api/trip/[seedCode]", error);
    return jsonError("Failed to fetch trip", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode, {
      requireHost: true,
    });
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json().catch(() => ({}));
    const currency =
      typeof body.currency === "string"
        ? body.currency.toUpperCase()
        : undefined;

    if (!currency || !isSupportedCurrency(currency)) {
      return jsonError("不支援的幣別", 400);
    }

    const existing = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!existing) return jsonError("Trip not found", 404);

    await prisma.trip.update({
      where: { seedCode },
      data: { currency },
    });

    const trip = await findTripBySeedCode(seedCode);
    if (!trip) return jsonError("Trip not found", 404);

    return NextResponse.json(serializeTrip(trip));
  } catch (error) {
    console.error("PATCH /api/trip/[seedCode]", error);
    return jsonError("Failed to update trip", 500);
  }
}
