import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getDiscoverDeck } from "@/lib/discover/catalog";
import { plantTripFromLikedCards } from "@/lib/plant-from-discover";
import type { PlantTripFromDiscoverBody } from "@/types/discover";

function plantTripErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "資料庫 schema 尚未更新，請執行 npm run db:push";
    }
  }
  if (error instanceof Error) {
    if (error.message.includes("Unknown field `expenses`")) {
      return "Prisma Client 過期，請執行 npx prisma generate 後重啟 npm run dev";
    }
    return error.message;
  }
  return "Failed to plant trip from discover";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PlantTripFromDiscoverBody;

    if (!body.destination?.trim()) {
      return jsonError("destination is required", 400);
    }
    if (!Array.isArray(body.liked) || body.liked.length === 0) {
      return jsonError("liked must contain at least one card", 400);
    }

    const deck = getDiscoverDeck(body.destination);
    const destLabel = deck?.destination.label ?? body.destination;

    let tripStartMidnight: Date;
    let tripEndMidnight: Date;
    let startDate: Date;
    let endDate: Date;

    if (body.startDate && body.endDate) {
      tripStartMidnight = new Date(body.startDate);
      tripEndMidnight = new Date(body.endDate);
      if (
        isNaN(tripStartMidnight.getTime()) ||
        isNaN(tripEndMidnight.getTime())
      ) {
        return jsonError("Invalid date format", 400);
      }
      tripStartMidnight.setHours(0, 0, 0, 0);
      tripEndMidnight.setHours(0, 0, 0, 0);
      if (tripEndMidnight < tripStartMidnight) {
        return jsonError("endDate must be on or after startDate", 400);
      }
      startDate = new Date(tripStartMidnight);
      startDate.setHours(9, 0, 0, 0);
      endDate = new Date(tripEndMidnight);
      endDate.setHours(18, 0, 0, 0);
    } else {
      const days = Math.min(Math.max(body.days ?? 5, 1), 14);
      tripStartMidnight = new Date();
      tripStartMidnight.setHours(0, 0, 0, 0);
      tripEndMidnight = new Date(tripStartMidnight);
      tripEndMidnight.setDate(tripEndMidnight.getDate() + days - 1);
      startDate = new Date(tripStartMidnight);
      startDate.setHours(9, 0, 0, 0);
      endDate = new Date(tripEndMidnight);
      endDate.setHours(18, 0, 0, 0);
    }

    const { seedCode, trip } = await plantTripFromLikedCards({
      destLabel,
      title: body.title,
      memberName: body.memberName,
      startDate,
      endDate,
      tripStartMidnight,
      tripEndMidnight,
      liked: body.liked,
    });

    return NextResponse.json(
      {
        trip,
        seedCode,
        redirectUrl: `/trip/${seedCode}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/discover/plant-trip", error);
    return jsonError(plantTripErrorMessage(error), 500);
  }
}
