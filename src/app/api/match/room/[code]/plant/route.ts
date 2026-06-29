import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import {
  aggregateVoteStats,
  getMatchRoomPhase,
  pickGroupLikedCards,
} from "@/lib/match-room";
import { plantTripFromLikedCards } from "@/lib/plant-from-discover";
import { getDiscoverDeck } from "@/lib/discover/catalog";
import { inferCurrencyFromDestination } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { code: raw } = await context.params;
    const roomCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(roomCode)) {
      return jsonError("Invalid room code", 400);
    }

    const body = await request.json().catch(() => ({}));
    const memberName = String(body.memberName ?? "").trim() || undefined;

    const room = await prisma.matchRoom.findUnique({
      where: { roomCode },
      include: { votes: true },
    });

    if (!room) return jsonError("揪團房間不存在", 404);

    if (room.plantedSeedCode) {
      return NextResponse.json({
        seedCode: room.plantedSeedCode,
        redirectUrl: `/trip/${room.plantedSeedCode}`,
        alreadyPlanted: true,
      });
    }

    if (getMatchRoomPhase(room) === "voting") {
      return jsonError("投票尚未截止，請等截止後再建立旅程排程", 400);
    }

    const deck = getDiscoverDeck(room.destinationSlug);
    if (!deck) return jsonError("尚無此地區的探索資料", 404);

    const { byCard } = aggregateVoteStats(room.votes);
    const liked = pickGroupLikedCards(deck.cards, byCard);

    if (liked.length === 0) {
      return jsonError("尚無任何人收藏，無法建立旅程", 400);
    }

    const tripStartMidnight = new Date(room.startDate);
    tripStartMidnight.setHours(0, 0, 0, 0);
    const tripEndMidnight = new Date(room.endDate);
    tripEndMidnight.setHours(0, 0, 0, 0);

    const startDate = new Date(tripStartMidnight);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(tripEndMidnight);
    endDate.setHours(18, 0, 0, 0);

    const { seedCode, trip } = await plantTripFromLikedCards({
      destLabel: room.destinationLabel,
      memberName,
      currency: inferCurrencyFromDestination(room.destinationSlug),
      startDate,
      endDate,
      tripStartMidnight,
      tripEndMidnight,
      liked,
    });

    await prisma.matchRoom.update({
      where: { id: room.id },
      data: { plantedSeedCode: seedCode },
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
    console.error("POST /api/match/room/[code]/plant", error);
    return jsonError("Failed to plant trip from room", 500);
  }
}
