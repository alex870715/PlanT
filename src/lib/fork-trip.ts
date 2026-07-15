import type { Prisma } from "@prisma/client";
import { isValidSeedCode, normalizeSeedCode } from "@/lib/api";
import { findTripById, findTripBySeedCode } from "@/lib/load-trip";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaMismatch } from "@/lib/prisma-compat";
import { generateUniqueSeedCode } from "@/lib/seed-code";
import { logTripActivity } from "@/lib/trip-activity";
import { saveTripHandbookForTripId } from "@/lib/save-trip-handbook";
import { DEFAULT_TRIP_TASKS } from "@/lib/trip-tasks";

export type ForkTripInput = {
  sourceSeedCode: string;
  userId: string;
  userEmail?: string | null;
  hostName: string;
  title?: string;
};

export type ForkTripResult =
  | { ok: true; seedCode: string }
  | { ok: false; status: number; error: string };

type SourceTask = {
  title: string;
  category: string;
  assignee: string | null;
  amount: Prisma.Decimal | null;
  notes: string | null;
  sortOrder: number;
};

function buildTaskCreates(source: {
  tasks?: SourceTask[];
}): Prisma.TripTaskCreateWithoutTripInput[] {
  const sourceTasks = source.tasks ?? [];
  if (sourceTasks.length > 0) {
    return sourceTasks.map((t) => ({
      title: t.title,
      category: t.category,
      assignee: t.assignee,
      amount: t.amount,
      notes: t.notes,
      done: false,
      sortOrder: t.sortOrder,
    }));
  }
  return DEFAULT_TRIP_TASKS.map((t) => ({
    title: t.title,
    category: t.category,
    sortOrder: t.sortOrder,
    done: false,
  }));
}

/** 從既有 Seed 複製主線行程與訂位待辦，建立全新旅程（僅複製者為主辦）。 */
export async function forkTripFromSeed(
  input: ForkTripInput
): Promise<ForkTripResult> {
  const sourceSeedCode = normalizeSeedCode(input.sourceSeedCode);
  if (!isValidSeedCode(sourceSeedCode)) {
    return { ok: false, status: 400, error: "Invalid seed code" };
  }

  const hostName = input.hostName.trim();
  if (!hostName) {
    return { ok: false, status: 400, error: "請輸入主辦人名字" };
  }

  const source = await findTripBySeedCode(sourceSeedCode);
  if (!source) {
    return { ok: false, status: 404, error: "Trip not found" };
  }

  const newSeedCode = await generateUniqueSeedCode();
  const title = input.title?.trim() || `${source.title}（我的副本）`;
  const now = new Date();
  const userEmail = input.userEmail?.toLowerCase().trim() ?? undefined;

  const trunkSpots = source.spots
    .filter((s) => s.isTrunk)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const spotCreates: Prisma.SpotCreateWithoutTripInput[] = trunkSpots.map(
    (s) => ({
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      openHours: s.openHours,
      phone: s.phone,
      notes: s.notes,
      scheduledAt: s.scheduledAt,
      travelMode: s.travelMode,
      travelMinutes: s.travelMinutes,
      isTrunk: true,
      sortOrder: s.sortOrder,
    })
  );

  const taskCreates = buildTaskCreates(
    "tasks" in source ? { tasks: source.tasks as SourceTask[] } : {}
  );

  const memberCreate: Prisma.MemberCreateWithoutTripInput = {
    name: hostName,
    isHost: true,
    email: userEmail,
    emailVerifiedAt: now,
    user: { connect: { id: input.userId } },
  };

  let tripId: string;
  let hostMemberId: string | undefined;

  try {
    const trip = await prisma.trip.create({
      data: {
        seedCode: newSeedCode,
        title,
        startDate: source.startDate,
        endDate: source.endDate,
        currency: source.currency,
        hostUserId: input.userId,
        hostEmail: userEmail,
        members: { create: memberCreate },
        spots: spotCreates.length > 0 ? { create: spotCreates } : undefined,
        tasks: taskCreates.length > 0 ? { create: taskCreates } : undefined,
      },
      include: { members: { where: { isHost: true }, take: 1 } },
    });
    tripId = trip.id;
    hostMemberId = trip.members[0]?.id;
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;

    const trip = await prisma.trip.create({
      data: {
        seedCode: newSeedCode,
        title,
        startDate: source.startDate,
        endDate: source.endDate,
        currency: source.currency,
        hostUserId: input.userId,
        hostEmail: userEmail,
        members: { create: memberCreate },
        spots: spotCreates.length > 0 ? { create: spotCreates } : undefined,
      },
      include: { members: { where: { isHost: true }, take: 1 } },
    });
    tripId = trip.id;
    hostMemberId = trip.members[0]?.id;
  }

  if (hostMemberId) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { hostMemberId },
    });

    await logTripActivity({
      tripId,
      memberId: hostMemberId,
      memberName: hostName,
      action: "trip_fork",
      detail: `從 ${sourceSeedCode} 複製 · ${trunkSpots.length} 個主線景點`,
    });
  }

  const full = await findTripById(tripId);
  if (!full) {
    return { ok: false, status: 500, error: "建立失敗" };
  }

  await saveTripHandbookForTripId(tripId);

  return { ok: true, seedCode: newSeedCode };
}
