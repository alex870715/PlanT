import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { serializeExpense } from "@/lib/expense-serializer";
import { prisma } from "@/lib/prisma";
import { logTripActivity } from "@/lib/trip-activity";
import { resolveTripActor } from "@/lib/trip-actor";
import { createExpenseSchema, parseBody } from "@/lib/validation";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = { params: Promise<{ seedCode: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const parsed = await parseBody(request, createExpenseSchema);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const body = parsed.data;

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      include: { members: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const memberIds = new Set(trip.members.map((m) => m.id));
    if (memberIds.size === 0) {
      return jsonError("請先新增團員才能記帳", 400);
    }

    if (!memberIds.has(body.paidByMemberId)) {
      return jsonError("請選擇有效的先付人", 400);
    }

    let splitMemberIds = (body.splitMemberIds ?? []).filter((id) =>
      memberIds.has(id)
    );
    if (splitMemberIds.length === 0) {
      splitMemberIds = [...memberIds];
    }

    const currency = (body.currency ?? trip.currency ?? "TWD").toUpperCase();
    // 與基準幣別相同時匯率固定為 1，避免誤填
    const exchangeRate =
      currency === (trip.currency ?? "TWD").toUpperCase()
        ? 1
        : (body.exchangeRate ?? 1);

    const expense = await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        title: body.title,
        amount: body.amount,
        currency,
        exchangeRate,
        paidByMemberId: body.paidByMemberId,
        splitMemberIds,
        notes: body.notes?.trim() || null,
      },
      include: { paidBy: true },
    });

    const actor = await resolveTripActor(request, trip.members);
    await logTripActivity({
      tripId: trip.id,
      memberId: actor.memberId ?? body.paidByMemberId,
      memberName: actor.memberName,
      action: "expense_add",
      targetType: "expense",
      targetId: expense.id,
      detail: body.title,
    });

    return NextResponse.json(serializeExpense(expense, trip.currency), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/expense", error);
    return jsonError("Failed to create expense", 500);
  }
}
