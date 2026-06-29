import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ seedCode: string }> };

/**
 * 標記 / 取消「建議轉帳」的完成狀態。
 * body: { fromMemberId, toMemberId, amount, done }
 *  - done=true  → upsert 一筆 TripSettlement
 *  - done=false → 刪除該筆
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const body = await request.json().catch(() => ({}));
    const fromMemberId = String(body.fromMemberId ?? "").trim();
    const toMemberId = String(body.toMemberId ?? "").trim();
    const amount = Number(body.amount);
    const done = body.done !== false;

    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId) {
      return jsonError("轉帳對象不正確", 400);
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return jsonError("金額不正確", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true, members: { select: { id: true } } },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const memberIds = new Set(trip.members.map((m) => m.id));
    if (!memberIds.has(fromMemberId) || !memberIds.has(toMemberId)) {
      return jsonError("成員不存在於此旅程", 400);
    }

    if (!done) {
      await prisma.tripSettlement.deleteMany({
        where: { tripId: trip.id, fromMemberId, toMemberId },
      });
      return NextResponse.json({ ok: true, done: false });
    }

    await prisma.tripSettlement.upsert({
      where: {
        tripId_fromMemberId_toMemberId: {
          tripId: trip.id,
          fromMemberId,
          toMemberId,
        },
      },
      create: { tripId: trip.id, fromMemberId, toMemberId, amount, done: true },
      update: { amount, done: true },
    });

    return NextResponse.json({ ok: true, done: true });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/settlement", error);
    return jsonError("Failed to update settlement", 500);
  }
}
