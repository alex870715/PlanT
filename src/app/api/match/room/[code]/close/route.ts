import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { getMatchRoomStatus } from "@/lib/match-room";
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
    const hostName = String(body.hostName ?? "").trim();

    const room = await prisma.matchRoom.findUnique({
      where: { roomCode },
    });

    if (!room) return jsonError("揪團房間不存在", 404);

    if (room.plantedSeedCode) {
      return jsonError("旅程已建立，無法變更投票狀態", 400);
    }

    if (hostName !== room.hostName) {
      return jsonError("只有發起人可以提前截止投票", 403);
    }

    if (getMatchRoomStatus(room).phase !== "voting") {
      return jsonError("投票已截止", 400);
    }

    const updated = await prisma.matchRoom.update({
      where: { id: room.id },
      data: { votingEndsAt: new Date() },
    });

    return NextResponse.json(getMatchRoomStatus(updated));
  } catch (error) {
    console.error("POST /api/match/room/[code]/close", error);
    return jsonError("Failed to close voting", 500);
  }
}
