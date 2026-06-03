import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getMatchRoomPhase } from "@/lib/match-room";

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { code: raw } = await context.params;
    const roomCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(roomCode)) {
      return jsonError("Invalid room code", 400);
    }

    const body = await request.json();
    const cardId = String(body.cardId ?? "").trim();
    const voterName = String(body.voterName ?? "").trim();
    const vote = String(body.vote ?? "").toLowerCase();

    if (!cardId || !voterName) {
      return jsonError("cardId and voterName are required", 400);
    }
    if (vote !== "like" && vote !== "pass") {
      return jsonError("vote must be like or pass", 400);
    }

    const room = await prisma.matchRoom.findUnique({
      where: { roomCode },
      select: { id: true, votingEndsAt: true, plantedSeedCode: true },
    });

    if (!room) return jsonError("揪團房間不存在", 404);

    if (getMatchRoomPhase(room) !== "voting") {
      return jsonError("投票已截止，無法再投票", 403);
    }

    await prisma.matchVote.upsert({
      where: {
        roomId_cardId_voterName: {
          roomId: room.id,
          cardId,
          voterName,
        },
      },
      create: {
        roomId: room.id,
        cardId,
        voterName,
        vote,
      },
      update: { vote },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/match/room/[code]/vote", error);
    return jsonError("Failed to save vote", 500);
  }
}
