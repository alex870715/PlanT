import { NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import {
  aggregateVoteStats,
  deckWithVoteStats,
  getMatchRoomStatus,
} from "@/lib/match-room";
import { getDiscoverDeck } from "@/lib/discover/catalog";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { code: raw } = await context.params;
    const roomCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(roomCode)) {
      return jsonError("Invalid room code", 400);
    }

    const room = await prisma.matchRoom.findUnique({
      where: { roomCode },
      include: { votes: true },
    });

    if (!room) return jsonError("揪團房間不存在", 404);

    const deck = getDiscoverDeck(room.destinationSlug);
    if (!deck) return jsonError("尚無此地區的探索資料", 404);

    const { voterCount, byCard } = aggregateVoteStats(room.votes);
    const status = getMatchRoomStatus(room);

    if (!status.votingOpen) {
      return jsonError("投票已截止，無法再滑卡", 403);
    }

    return NextResponse.json({
      destination: deck.destination,
      cards: deckWithVoteStats(deck.cards, byCard, voterCount),
      voterCount,
      startDate: room.startDate.toISOString(),
      endDate: room.endDate.toISOString(),
      hostName: room.hostName,
      ...status,
    });
  } catch (error) {
    console.error("GET /api/match/room/[code]/deck", error);
    return jsonError("Failed to load deck", 500);
  }
}
