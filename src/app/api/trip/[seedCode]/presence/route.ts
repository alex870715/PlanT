import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logTripActivity } from "@/lib/trip-activity";
import { resolveTripActor } from "@/lib/trip-actor";
import { isPresenceStatus, serializePresence } from "@/lib/trip-presence";

type RouteContext = { params: Promise<{ seedCode: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const body = await request.json().catch(() => ({}));
    const memberId = String(body.memberId ?? "").trim();
    const status = String(body.status ?? "idle").trim();
    const lateMinutes =
      body.lateMinutes == null ? null : Number(body.lateMinutes);
    const spotId = body.spotId ? String(body.spotId) : null;
    const message = body.message ? String(body.message).slice(0, 200) : null;

    if (!memberId) return jsonError("請選擇團員", 400);
    if (!isPresenceStatus(status)) {
      return jsonError("無效的狀態", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      include: { members: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const member = trip.members.find((m) => m.id === memberId);
    if (!member) return jsonError("成員不存在", 400);

    const presence = await prisma.tripMemberPresence.upsert({
      where: {
        tripId_memberId: { tripId: trip.id, memberId: member.id },
      },
      create: {
        tripId: trip.id,
        memberId: member.id,
        memberName: member.name,
        status,
        lateMinutes: status === "late" ? lateMinutes : null,
        spotId,
        message,
      },
      update: {
        memberName: member.name,
        status,
        lateMinutes: status === "late" ? lateMinutes : null,
        spotId,
        message,
      },
    });

    const actor = await resolveTripActor(request, trip.members);
    const statusLabel =
      status === "arrived"
        ? "到了"
        : status === "late"
          ? `晚到 ${lateMinutes ?? "?"} 分`
          : status === "on_way"
            ? "出發中"
            : "重置狀態";

    await logTripActivity({
      tripId: trip.id,
      memberId: actor.memberId ?? member.id,
      memberName: actor.memberName,
      action: "presence_update",
      detail: `${member.name}：${statusLabel}${message ? `（${message}）` : ""}`,
    });

    return NextResponse.json(serializePresence(presence));
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/presence", error);
    return jsonError("Failed to update presence", 500);
  }
}
