import { prisma } from "@/lib/prisma";
import { isValidSeedCode, normalizeSeedCode } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export const SEED_HEADER = "x-plant-seed";

export type AccessResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export type TripRole = "viewer" | "member" | "host";

export type TripAccessContext = {
  tripId: string;
  seedCode: string;
  role: TripRole;
  memberId?: string;
  userId?: string;
};

export async function resolveTripAccess(
  _request: Request,
  seedCode: string
): Promise<TripAccessContext | null> {
  const normalized = normalizeSeedCode(seedCode);
  if (!isValidSeedCode(normalized)) return null;

  const trip = await prisma.trip.findUnique({
    where: { seedCode: normalized },
    select: { id: true, seedCode: true },
  });
  if (!trip) return null;

  const user = await getSessionUser();
  if (user?.id) {
    const member = await prisma.member.findFirst({
      where: { tripId: trip.id, userId: user.id },
      select: { id: true, isHost: true },
    });
    if (member) {
      return {
        tripId: trip.id,
        seedCode: trip.seedCode,
        role: member.isHost ? "host" : "member",
        memberId: member.id,
        userId: user.id,
      };
    }
  }

  return {
    tripId: trip.id,
    seedCode: trip.seedCode,
    role: "viewer",
  };
}

export async function requireTripEdit(
  request: Request,
  seedCode: string
): Promise<AccessResult<TripAccessContext>> {
  const ctx = await resolveTripAccess(request, seedCode);
  if (!ctx) {
    return { ok: false, status: 404, error: "Trip not found" };
  }
  if (ctx.role === "viewer") {
    return {
      ok: false,
      status: 403,
      error: "請先登入並加入此旅程（在下方輸入名字）",
    };
  }
  return { ok: true, value: ctx };
}

export async function requireTripHost(
  request: Request,
  seedCode: string
): Promise<AccessResult<TripAccessContext>> {
  const edit = await requireTripEdit(request, seedCode);
  if (!edit.ok) return edit;
  if (edit.value.role !== "host") {
    return { ok: false, status: 403, error: "需要主辦人權限" };
  }
  return edit;
}

export async function autoLinkHostOnTripCreate(input: {
  tripId: string;
  userId: string;
  userEmail?: string | null;
}): Promise<void> {
  const hostMember = await prisma.member.findFirst({
    where: { tripId: input.tripId, isHost: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const memberId =
    hostMember?.id ??
    (
      await prisma.member.findFirst({
        where: { tripId: input.tripId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id;
  if (!memberId) return;

  await prisma.member.update({
    where: { id: memberId },
    data: {
      userId: input.userId,
      email: input.userEmail?.toLowerCase().trim() ?? undefined,
      emailVerifiedAt: new Date(),
      isHost: true,
    },
  });
  await prisma.trip.update({
    where: { id: input.tripId },
    data: {
      hostMemberId: memberId,
      hostUserId: input.userId,
      hostEmail: input.userEmail?.toLowerCase().trim() ?? undefined,
    },
  });
}

/** 登入後以自訂名字加入旅程（建立並綁定 Member） */
export async function joinTripAsUser(input: {
  seedCode: string;
  userId: string;
  userEmail?: string | null;
  displayName: string;
}): Promise<
  AccessResult<{ memberId: string; role: TripRole; name: string; created: boolean }>
> {
  const seedCode = normalizeSeedCode(input.seedCode);
  if (!isValidSeedCode(seedCode)) {
    return { ok: false, status: 400, error: "Invalid seed code" };
  }

  const name = input.displayName.trim();
  if (!name) {
    return { ok: false, status: 400, error: "請輸入你的名字" };
  }

  const trip = await prisma.trip.findUnique({
    where: { seedCode },
    select: { id: true },
  });
  if (!trip) return { ok: false, status: 404, error: "Trip not found" };

  const existing = await prisma.member.findFirst({
    where: { tripId: trip.id, userId: input.userId },
    select: { id: true, name: true, isHost: true },
  });
  if (existing) {
    return {
      ok: true,
      value: {
        memberId: existing.id,
        role: existing.isHost ? "host" : "member",
        name: existing.name,
        created: false,
      },
    };
  }

  const now = new Date();
  const member = await prisma.member.create({
    data: {
      tripId: trip.id,
      name,
      userId: input.userId,
      email: input.userEmail?.toLowerCase().trim() ?? undefined,
      emailVerifiedAt: now,
      isHost: false,
    },
  });

  return {
    ok: true,
    value: {
      memberId: member.id,
      role: "member",
      name: member.name,
      created: true,
    },
  };
}
