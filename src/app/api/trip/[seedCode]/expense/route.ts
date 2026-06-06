import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { serializeExpense } from "@/lib/expense-serializer";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ seedCode: string }> };

function parseSplitIds(body: unknown, tripMemberIds: Set<string>): string[] {
  if (!Array.isArray(body)) return [];
  const ids = body.filter((id): id is string => typeof id === "string");
  return ids.filter((id) => tripMemberIds.has(id));
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      include: { members: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const memberIds = new Set(trip.members.map((m) => m.id));
    if (memberIds.size === 0) {
      return jsonError("請先新增團員才能記帳", 400);
    }

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const paidByMemberId = String(body.paidByMemberId ?? "").trim();
    const amount = Number(body.amount);

    if (!title) return jsonError("title is required", 400);
    if (!paidByMemberId || !memberIds.has(paidByMemberId)) {
      return jsonError("請選擇有效的先付人", 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("金額必須大於 0", 400);
    }

    let splitMemberIds = parseSplitIds(body.splitMemberIds, memberIds);
    if (splitMemberIds.length === 0) {
      splitMemberIds = [...memberIds];
    }

    const expense = await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        title,
        amount,
        paidByMemberId,
        splitMemberIds,
        notes: body.notes ? String(body.notes).trim() : null,
      },
      include: { paidBy: true },
    });

    return NextResponse.json(serializeExpense(expense), { status: 201 });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/expense", error);
    return jsonError("Failed to create expense", 500);
  }
}
