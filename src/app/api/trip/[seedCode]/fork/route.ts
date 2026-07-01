import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { forkTripFromSeed } from "@/lib/fork-trip";
import { findTripBySeedCode } from "@/lib/load-trip";
import { getSessionUser } from "@/lib/session";
import { serializeTrip } from "@/lib/trip-serializer";
import { forkTripSchema, parseBody } from "@/lib/validation";

type RouteContext = { params: Promise<{ seedCode: string }> };

/** 複製此 Seed 的行程與訂位待辦為全新旅程，登入者為主辦（不含原團員／支線／記帳）。 */
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

    const parsed = await parseBody(request, forkTripSchema);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const hostName = parsed.data.hostName.trim() || user.name?.trim() || "主辦人";

    const result = await forkTripFromSeed({
      sourceSeedCode: seedCode,
      userId: user.id,
      userEmail: user.email,
      hostName,
      title: parsed.data.title,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    const trip = await findTripBySeedCode(result.seedCode);
    if (!trip) {
      return jsonError("建立失敗", 500);
    }

    return NextResponse.json(
      {
        seedCode: result.seedCode,
        trip: serializeTrip(trip),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/trip/[seedCode]/fork", error);
    return jsonError("複製失敗", 500);
  }
}
