import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getDiscoverDeck } from "@/lib/discover/catalog";
import { generateUniqueRoomCode } from "@/lib/match-room";
import {
  parseDateTimeLocal,
  tripRangeToIso,
  validateTripDateRange,
  validateVotingDeadline,
} from "@/lib/trip-dates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const destination = String(body.destination ?? "").trim();
    const start = String(body.startDate ?? body.start ?? "");
    const end = String(body.endDate ?? body.end ?? "");
    const hostName = String(body.hostName ?? "").trim();
    const votingDeadline = String(
      body.votingDeadline ?? body.votingEndsAt ?? ""
    ).trim();

    if (!destination) return jsonError("destination is required", 400);
    if (!hostName) return jsonError("請填寫發起人名字", 400);
    const dateError = validateTripDateRange(start, end);
    if (dateError) return jsonError(dateError, 400);
    const deadlineError = validateVotingDeadline(votingDeadline);
    if (deadlineError) return jsonError(deadlineError, 400);

    const deck = getDiscoverDeck(destination);
    if (!deck) {
      return jsonError("尚無此地區的探索資料", 404);
    }

    const { startDate, endDate } = tripRangeToIso(start, end);
    const roomCode = await generateUniqueRoomCode();

    const votingEndsAt = parseDateTimeLocal(votingDeadline);

    const room = await prisma.matchRoom.create({
      data: {
        roomCode,
        destinationSlug: deck.destination.slug,
        destinationLabel: deck.destination.label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        hostName,
        votingEndsAt,
      },
    });

    return NextResponse.json(
      {
        roomCode: room.roomCode,
        destination: deck.destination,
        startDate,
        endDate,
        hostName: room.hostName,
        votingEndsAt: room.votingEndsAt!.toISOString(),
        phase: "voting",
        votingOpen: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/match/room", error);
    return jsonError("Failed to create match room", 500);
  }
}
