import type { Member, Spot, Trip, TripTask } from "@prisma/client";
import { serializeSpot } from "@/lib/spot-serializer";
import type { TripDto } from "@/types/trip";

type TripWithRelations = Trip & {
  spots: (Spot & { member: Member | null })[];
  members: Member[];
  tasks?: TripTask[];
};

export function serializeTrip(trip: TripWithRelations): TripDto {
  return {
    id: trip.id,
    seedCode: trip.seedCode,
    title: trip.title,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    spots: trip.spots.map((spot) => serializeSpot(spot)),
    members: trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    })),
    tasks: (trip.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      assignee: t.assignee,
      amount: t.amount,
      notes: t.notes,
      done: t.done,
      sortOrder: t.sortOrder,
    })),
  };
}
