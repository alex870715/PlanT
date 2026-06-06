import { prisma } from "@/lib/prisma";
import { generateUniqueSeedCode } from "@/lib/seed-code";
import { buildGeoSchedule } from "@/lib/trip-schedule";
import { findTripById } from "@/lib/load-trip";
import { isPrismaSchemaMismatch } from "@/lib/prisma-compat";
import { DEFAULT_TRIP_TASKS } from "@/lib/trip-tasks";
import { serializeTrip } from "@/lib/trip-serializer";
import type { DiscoverCard } from "@/types/discover";

export async function plantTripFromLikedCards(options: {
  destLabel: string;
  title?: string;
  memberName?: string;
  startDate: Date;
  endDate: Date;
  tripStartMidnight: Date;
  tripEndMidnight: Date;
  liked: DiscoverCard[];
}) {
  const {
    destLabel,
    title,
    memberName,
    startDate,
    endDate,
    tripStartMidnight,
    liked,
  } = options;

  const seedCode = await generateUniqueSeedCode();
  const tripTitle = title?.trim() || `${destLabel} 探索之旅 🌿`;

  const base = {
    seedCode,
    title: tripTitle,
    startDate,
    endDate,
    members: {
      create: { name: memberName?.trim() || "探索隊長" },
    },
  };

  let trip: { id: string };
  try {
    trip = await prisma.trip.create({
      data: {
        ...base,
        tasks: {
          create: DEFAULT_TRIP_TASKS.map((t) => ({
            title: t.title,
            category: t.category,
            sortOrder: t.sortOrder,
          })),
        },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) throw error;
    trip = await prisma.trip.create({ data: base });
  }

  const createdSpots = [];
  for (let i = 0; i < liked.length; i++) {
    const card = liked[i];
    const spot = await prisma.spot.create({
      data: {
        tripId: trip.id,
        name: card.name,
        latitude: card.latitude,
        longitude: card.longitude,
        notes: `${card.category === "food" ? "🍽️" : "📍"} ${card.description} · 聲量 ${card.popularity}`,
        openHours: card.category === "food" ? "建議預約或離峰" : undefined,
        isTrunk: true,
        sortOrder: i,
      },
    });
    createdSpots.push(spot);
  }

  if (createdSpots.length > 0) {
    const scheduleUpdates = buildGeoSchedule(
      createdSpots.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        openHours: s.openHours,
        phone: s.phone,
        notes: s.notes,
        scheduledAt: null,
        travelMode: null,
        travelMinutes: null,
        isTrunk: true,
        sortOrder: s.sortOrder,
        memberId: null,
      })),
      tripStartMidnight.toISOString(),
      options.tripEndMidnight.toISOString()
    );

    await prisma.$transaction(
      scheduleUpdates.map((u) =>
        prisma.spot.update({
          where: { id: u.id },
          data: {
            scheduledAt: new Date(u.scheduledAt),
            sortOrder: u.sortOrder,
          },
        })
      )
    );
  }

  const full = await findTripById(trip.id);
  if (!full) throw new Error("Trip not found after create");

  return { seedCode, trip: serializeTrip(full) };
}
