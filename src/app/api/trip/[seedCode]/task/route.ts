import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ seedCode: string }> };

function serializeTask(task: {
  id: string;
  title: string;
  category: string;
  assignee: string | null;
  amount: number | null;
  notes: string | null;
  done: boolean;
  sortOrder: number;
}) {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    assignee: task.assignee,
    amount: task.amount,
    notes: task.notes,
    done: task.done,
    sortOrder: task.sortOrder,
  };
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
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError("title is required", 400);

    const maxOrder = await prisma.tripTask.aggregate({
      where: { tripId: trip.id },
      _max: { sortOrder: true },
    });

    const task = await prisma.tripTask.create({
      data: {
        tripId: trip.id,
        title,
        category: String(body.category ?? "other").trim() || "other",
        assignee: body.assignee ? String(body.assignee).trim() : null,
        amount:
          typeof body.amount === "number" && !isNaN(body.amount)
            ? body.amount
            : null,
        notes: body.notes ? String(body.notes).trim() : null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/task", error);
    return jsonError("Failed to create task", 500);
  }
}
