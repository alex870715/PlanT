import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { joinTripAsUser } from "@/lib/trip-access";
import { logTripActivity } from "@/lib/trip-activity";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ seedCode: string }> };

/** 登入後以自訂名字加入旅程 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return jsonError("請先登入", 401);
    }

    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const body = await request.json().catch(() => ({}));
    const displayName =
      typeof body.name === "string"
        ? body.name.trim()
        : (user.name?.trim() ?? "");

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const result = await joinTripAsUser({
      seedCode,
      userId: user.id,
      userEmail: user.email,
      displayName,
    });
    if (!result.ok) return jsonError(result.error, result.status);

    if (result.value.created) {
      await logTripActivity({
        tripId: trip.id,
        memberId: result.value.memberId,
        memberName: result.value.name,
        action: "member.join",
        detail: user.email ?? undefined,
      });
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/join", error);
    return jsonError("加入失敗", 500);
  }
}
