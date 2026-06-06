import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaMismatch } from "@/lib/prisma-compat";
import { tripIncludeFallbacks } from "@/lib/trip-include";
import { DEFAULT_TRIP_TASKS } from "@/lib/trip-tasks";

type TripWithRelations = Prisma.TripGetPayload<{
  include: (typeof tripIncludeFallbacks)[number];
}>;

export async function findTripBySeedCode(
  seedCode: string
): Promise<TripWithRelations | null> {
  for (const include of tripIncludeFallbacks) {
    try {
      return await prisma.trip.findUnique({ where: { seedCode }, include });
    } catch (error) {
      if (!isPrismaSchemaMismatch(error)) throw error;
    }
  }
  return null;
}

export async function findTripById(
  id: string
): Promise<TripWithRelations | null> {
  for (const include of tripIncludeFallbacks) {
    try {
      return await prisma.trip.findUnique({ where: { id }, include });
    } catch (error) {
      if (!isPrismaSchemaMismatch(error)) throw error;
    }
  }
  return null;
}

type CreateTripInput = {
  seedCode: string;
  title: string;
  startDate: Date;
  endDate: Date;
  memberName: string;
};

export async function createTripWithDefaults(
  input: CreateTripInput
): Promise<TripWithRelations> {
  const base: Prisma.TripCreateInput = {
    seedCode: input.seedCode,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    members: {
      create: { name: input.memberName },
    },
  };

  const taskCreates = DEFAULT_TRIP_TASKS.map((t) => ({
    title: t.title,
    category: t.category,
    sortOrder: t.sortOrder,
  }));

  let trip: { id: string } | null = null;

  try {
    trip = await prisma.trip.create({
      data: {
        ...base,
        tasks: { create: taskCreates },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    trip = await prisma.trip.create({ data: base });
  }

  const full = await findTripById(trip.id);
  if (!full) throw new Error("Trip not found after create");
  return full;
}
