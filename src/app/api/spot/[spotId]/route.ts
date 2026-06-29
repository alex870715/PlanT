import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeSpot } from "@/lib/spot-serializer";
import { logTripActivity } from "@/lib/trip-activity";
import { resolveTripActor } from "@/lib/trip-actor";
import { authorizeSpot } from "@/lib/trip-auth";
import type { UpdateSpotBody } from "@/types/trip";

type RouteContext = { params: Promise<{ spotId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { spotId } = await context.params;

    const access = await authorizeSpot(request, spotId);
    if (!access.ok) return jsonError(access.error, access.status);

    const body = (await request.json()) as UpdateSpotBody;

    const existing = await prisma.spot.findUnique({
      where: { id: spotId },
      include: { trip: { include: { members: true } } },
    });
    if (!existing) return jsonError("Spot not found", 404);

    if (body.expectedUpdatedAt) {
      const expected = new Date(body.expectedUpdatedAt).getTime();
      const current = existing.updatedAt.getTime();
      if (expected !== current) {
        return NextResponse.json(
          {
            error: "此景點已被其他人修改，請重新載入後再試",
            code: "CONFLICT",
            serverUpdatedAt: existing.updatedAt.toISOString(),
          },
          { status: 409 }
        );
      }
    }

    if (body.name !== undefined && !body.name.trim()) {
      return jsonError("name cannot be empty", 400);
    }
    if (
      body.latitude !== undefined &&
      (typeof body.latitude !== "number" || !Number.isFinite(body.latitude))
    ) {
      return jsonError("Invalid latitude", 400);
    }
    if (
      body.longitude !== undefined &&
      (typeof body.longitude !== "number" || !Number.isFinite(body.longitude))
    ) {
      return jsonError("Invalid longitude", 400);
    }

    let scheduledAt: Date | null | undefined = undefined;
    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null) {
        scheduledAt = null;
      } else {
        const d = new Date(body.scheduledAt);
        if (isNaN(d.getTime())) return jsonError("Invalid scheduledAt", 400);
        scheduledAt = d;
      }
    }

    const updated = await prisma.spot.update({
      where: { id: spotId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.openHours !== undefined && {
          openHours: body.openHours?.trim() || null,
        }),
        ...(body.phone !== undefined && {
          phone: body.phone?.trim() || null,
        }),
        ...(body.notes !== undefined && {
          notes: body.notes?.trim() || null,
        }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.travelMode !== undefined && {
          travelMode: body.travelMode?.trim() || null,
        }),
        ...(body.travelMinutes !== undefined && {
          travelMinutes:
            body.travelMinutes === null || body.travelMinutes === undefined
              ? null
              : Math.max(0, Math.round(Number(body.travelMinutes))),
        }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
      include: { member: true },
    });

    const actor = await resolveTripActor(request, existing.trip.members);
    await logTripActivity({
      tripId: existing.tripId,
      memberId: actor.memberId,
      memberName: actor.memberName,
      action: "spot_update",
      targetType: "spot",
      targetId: spotId,
      detail: updated.name,
    });

    return NextResponse.json(serializeSpot(updated));
  } catch (error) {
    console.error("PATCH /api/spot/[spotId]", error);
    return jsonError("Failed to update spot", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { spotId } = await context.params;

    const access = await authorizeSpot(request, spotId);
    if (!access.ok) return jsonError(access.error, access.status);

    const spot = await prisma.spot.findUnique({
      where: { id: spotId },
      include: { trip: { include: { members: true } } },
    });
    if (!spot) return jsonError("Spot not found", 404);

    await prisma.spot.delete({ where: { id: spotId } });

    const actor = await resolveTripActor(request, spot.trip.members);
    await logTripActivity({
      tripId: spot.tripId,
      memberId: actor.memberId,
      memberName: actor.memberName,
      action: "spot_delete",
      targetType: "spot",
      targetId: spotId,
      detail: spot.name,
    });

    return NextResponse.json({ success: true, id: spotId });
  } catch (error) {
    console.error("DELETE /api/spot/[spotId]", error);
    return jsonError("Failed to delete spot", 500);
  }
}
