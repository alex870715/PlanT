import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveTripAccess } from "@/lib/trip-access";
import { resolveHostMemberId } from "@/lib/trip-host";
import { getSessionUser } from "@/lib/session";

type RouteContext = { params: Promise<{ seedCode: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: {
        id: true,
        hostMemberId: true,
        hostUserId: true,
        hostEmail: true,
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
            isHost: true,
            userId: true,
          },
        },
      },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const access = await resolveTripAccess(_request, seedCode);
    const sessionUser = await getSessionUser();
    const hostMemberId = resolveHostMemberId(trip.hostMemberId, trip.members);

    return NextResponse.json({
      loggedIn: !!sessionUser,
      user: sessionUser
        ? {
            id: sessionUser.id,
            name: sessionUser.name,
            email: sessionUser.email,
            image: sessionUser.image,
          }
        : null,
      linkedMemberId: access?.memberId ?? null,
      hostMemberId,
      hostUserId: trip.hostUserId,
      role: access?.role ?? "viewer",
      canEdit: access ? access.role !== "viewer" : false,
      isHost: access?.role === "host",
      members: trip.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        emailVerified: !!m.emailVerifiedAt,
        isHost: m.isHost || m.id === hostMemberId,
        isClaimed: !!m.userId,
        isLinkedToMe: sessionUser ? m.userId === sessionUser.id : false,
        userId: m.userId,
      })),
    });
  } catch (error) {
    console.error("GET /api/trip/[seedCode]/auth/status", error);
    return jsonError("Failed to fetch auth status", 500);
  }
}
