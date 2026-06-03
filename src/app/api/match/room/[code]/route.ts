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
    const { voterCount, byCard } = aggregateVoteStats(room.votes);
    const cards = deck
      ? deckWithVoteStats(deck.cards, byCard, voterCount)
      : [];

    const groupLiked = cards
      .filter((c) => c.groupLikes > 0)
      .sort((a, b) => b.groupLikes - a.groupLikes);

    const status = getMatchRoomStatus(room);

    return NextResponse.json({
      roomCode: room.roomCode,
      destination: deck?.destination ?? {
        slug: room.destinationSlug,
        label: room.destinationLabel,
        emoji: "🌿",
        center: { lat: 0, lng: 0 },
      },
      startDate: room.startDate.toISOString(),
      endDate: room.endDate.toISOString(),
      hostName: room.hostName,
      plantedSeedCode: room.plantedSeedCode,
      ...status,
      voterCount,
      cards,
      groupLiked,
      votes: room.votes.map((v) => ({
        cardId: v.cardId,
        voterName: v.voterName,
        vote: v.vote,
      })),
    });
  } catch (error) {
    console.error("GET /api/match/room/[code]", error);
    return jsonError("Failed to load match room", 500);
  }
}
