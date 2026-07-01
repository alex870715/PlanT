import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeTaskConfirmation } from "@/lib/task-serializer";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = {
  params: Promise<{ seedCode: string; taskId: string }>;
};

/** 團員確認 / 取消確認 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json().catch(() => ({}));
    const memberId = String(body.memberId ?? "").trim();
    const confirmed = body.confirmed !== false;

    if (!memberId) return jsonError("請選擇團員", 400);

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      include: { members: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const member = trip.members.find((m) => m.id === memberId);
    if (!member) return jsonError("成員不存在", 400);

    const task = await prisma.tripTask.findFirst({
      where: { id: taskId, tripId: trip.id },
    });
    if (!task) return jsonError("Task not found", 404);

    if (!confirmed) {
      await prisma.tripTaskConfirmation.deleteMany({
        where: { taskId: task.id, memberId: member.id },
      });
      return NextResponse.json({ ok: true, confirmed: false });
    }

    const row = await prisma.tripTaskConfirmation.upsert({
      where: {
        taskId_memberId: { taskId: task.id, memberId: member.id },
      },
      create: {
        taskId: task.id,
        memberId: member.id,
        memberName: member.name,
      },
      update: { memberName: member.name },
    });

    return NextResponse.json({
      ok: true,
      confirmed: true,
      confirmation: serializeTaskConfirmation(row),
    });
  } catch (error) {
    console.error("POST task confirm", error);
    return jsonError("Failed to update confirmation", 500);
  }
}
