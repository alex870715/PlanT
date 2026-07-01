import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { serializeExpense } from "@/lib/expense-serializer";
import { prisma } from "@/lib/prisma";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = {
  params: Promise<{ seedCode: string; expenseId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, expenseId } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      include: { members: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const existing = await prisma.tripExpense.findFirst({
      where: { id: expenseId, tripId: trip.id },
    });
    if (!existing) return jsonError("Expense not found", 404);

    const memberIds = new Set(trip.members.map((m) => m.id));
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError("title cannot be empty", 400);
      data.title = title;
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return jsonError("金額必須大於 0", 400);
      }
      data.amount = amount;
    }
    if (body.paidByMemberId !== undefined) {
      const paidByMemberId = String(body.paidByMemberId).trim();
      if (!memberIds.has(paidByMemberId)) {
        return jsonError("請選擇有效的先付人", 400);
      }
      data.paidByMemberId = paidByMemberId;
    }
    if (body.splitMemberIds !== undefined) {
      const splitMemberIds = Array.isArray(body.splitMemberIds)
        ? body.splitMemberIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && memberIds.has(id)
          )
        : [];
      if (splitMemberIds.length === 0) {
        return jsonError("至少選一位參與分帳的團員", 400);
      }
      data.splitMemberIds = splitMemberIds;
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === ""
          ? null
          : String(body.notes).trim();
    }

    const expense = await prisma.tripExpense.update({
      where: { id: expenseId },
      data,
      include: { paidBy: true },
    });

    return NextResponse.json(serializeExpense(expense));
  } catch (error) {
    console.error("PATCH /api/trip/[seedCode]/expense/[expenseId]", error);
    return jsonError("Failed to update expense", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, expenseId } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const existing = await prisma.tripExpense.findFirst({
      where: { id: expenseId, tripId: trip.id },
    });
    if (!existing) return jsonError("Expense not found", 404);

    await prisma.tripExpense.delete({ where: { id: expenseId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/trip/[seedCode]/expense/[expenseId]", error);
    return jsonError("Failed to delete expense", 500);
  }
}
