import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ seedCode: string; taskId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const existing = await prisma.tripTask.findFirst({
      where: { id: taskId, tripId: trip.id },
    });
    if (!existing) return jsonError("Task not found", 404);

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError("title cannot be empty", 400);
      data.title = title;
    }
    if (body.category !== undefined) {
      data.category = String(body.category).trim() || "other";
    }
    if (body.assignee !== undefined) {
      data.assignee =
        body.assignee === null || body.assignee === ""
          ? null
          : String(body.assignee).trim();
    }
    if (body.amount !== undefined) {
      data.amount =
        body.amount === null || body.amount === ""
          ? null
          : Number(body.amount);
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === ""
          ? null
          : String(body.notes).trim();
    }
    if (typeof body.done === "boolean") data.done = body.done;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

    const task = await prisma.tripTask.update({
      where: { id: taskId },
      data,
    });

    return NextResponse.json({
      id: task.id,
      title: task.title,
      category: task.category,
      assignee: task.assignee,
      amount: task.amount == null ? null : Number(task.amount),
      notes: task.notes,
      done: task.done,
      sortOrder: task.sortOrder,
    });
  } catch (error) {
    console.error("PATCH /api/trip/[seedCode]/task/[taskId]", error);
    return jsonError("Failed to update task", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId } = await context.params;
    const seedCode = normalizeSeedCode(raw);

    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const existing = await prisma.tripTask.findFirst({
      where: { id: taskId, tripId: trip.id },
    });
    if (!existing) return jsonError("Task not found", 404);

    await prisma.tripTask.delete({ where: { id: taskId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/trip/[seedCode]/task/[taskId]", error);
    return jsonError("Failed to delete task", 500);
  }
}
