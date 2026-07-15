import { prisma } from "@/lib/prisma";
import { findTripById } from "@/lib/load-trip";
import { isPrismaSchemaMismatch } from "@/lib/prisma-compat";
import {
  buildTripHandbookInputFromTrip,
  generateTripHandbook,
} from "@/lib/trip-handbook";
import type { HandbookSlide, TripHandbook, TripHandbookDto } from "@/types/trip-handbook";
import type { TripDto } from "@/types/trip";

export async function getAnchorLodgingForTripId(
  tripId: string
): Promise<boolean> {
  try {
    const row = await prisma.tripHandbook.findUnique({
      where: { tripId },
      select: { anchorLodging: true },
    });
    return row?.anchorLodging ?? true;
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    return true;
  }
}

export async function attachTripHandbookSettings(
  trip: TripDto,
  tripId: string
): Promise<TripDto> {
  const anchorLodging = await getAnchorLodgingForTripId(tripId);
  return { ...trip, anchorLodging };
}

export function serializeTripHandbook(handbook: {
  theme?: string;
  purpose: string;
  slides: unknown;
  anchorLodging?: boolean;
  generatedAt: Date;
  updatedAt: Date;
}): TripHandbookDto {
  return {
    theme: (handbook.theme as TripHandbook["theme"]) ?? "fairy-tale",
    purpose: handbook.purpose,
    slides: handbook.slides as HandbookSlide[],
    anchorLodging: handbook.anchorLodging ?? true,
    generatedAt: handbook.generatedAt.toISOString(),
    updatedAt: handbook.updatedAt.toISOString(),
  };
}

export async function saveTripHandbookForTripId(
  tripId: string,
  options?: { destinationLabel?: string; anchorLodging?: boolean }
): Promise<TripHandbookDto | null> {
  try {
    const trip = await findTripById(tripId);
    if (!trip) return null;

    let anchorLodging = options?.anchorLodging ?? true;
    if (options?.anchorLodging === undefined) {
      try {
        const existing = await prisma.tripHandbook.findUnique({
          where: { tripId },
          select: { anchorLodging: true },
        });
        if (existing?.anchorLodging !== undefined) {
          anchorLodging = existing.anchorLodging;
        }
      } catch (error) {
        if (!isPrismaSchemaMismatch(error)) throw error;
      }
    }

    const input = buildTripHandbookInputFromTrip(trip, options);
    const content = await generateTripHandbook(input, { anchorLodging });

    const handbook = await prisma.tripHandbook.upsert({
      where: { tripId },
      create: {
        tripId,
        theme: content.theme,
        anchorLodging: content.anchorLodging,
        purpose: content.purpose,
        slides: content.slides,
      },
      update: {
        theme: content.theme,
        anchorLodging: content.anchorLodging,
        purpose: content.purpose,
        slides: content.slides,
      },
    });
    return serializeTripHandbook(handbook);
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    return null;
  }
}

export async function updateTripHandbook(
  tripId: string,
  patch: {
    purpose?: string;
    slides?: HandbookSlide[];
    anchorLodging?: boolean;
  }
): Promise<TripHandbookDto | null> {
  try {
    const handbook = await prisma.tripHandbook.update({
      where: { tripId },
      data: {
        ...(patch.purpose !== undefined ? { purpose: patch.purpose } : {}),
        ...(patch.slides !== undefined ? { slides: patch.slides } : {}),
        ...(patch.anchorLodging !== undefined
          ? { anchorLodging: patch.anchorLodging }
          : {}),
      },
    });
    return serializeTripHandbook(handbook);
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    return null;
  }
}

export async function getTripHandbookBySeedCode(
  seedCode: string
): Promise<TripHandbookDto | null> {
  try {
    const handbook = await prisma.tripHandbook.findFirst({
      where: { trip: { seedCode } },
    });
    return handbook ? serializeTripHandbook(handbook) : null;
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    return null;
  }
}

export async function getOrCreateTripHandbook(
  seedCode: string,
  options?: { destinationLabel?: string }
): Promise<TripHandbookDto | null> {
  const existing = await getTripHandbookBySeedCode(seedCode);
  if (existing) return existing;

  const trip = await prisma.trip.findUnique({
    where: { seedCode },
    select: { id: true },
  });
  if (!trip) return null;

  return saveTripHandbookForTripId(trip.id, options);
}
