import type {
  Member,
  Spot,
  Trip,
  TripExpense,
  TripSettlement,
  TripTask,
} from "@prisma/client";
import { serializeExpense } from "@/lib/expense-serializer";
import { serializeSpot } from "@/lib/spot-serializer";
import { serializeTask } from "@/lib/task-serializer";
import type { TripDto } from "@/types/trip";

type TripWithRelations = Trip & {
  spots: (Spot & { member: Member | null })[];
  members: Member[];
  tasks?: TripTask[];
  expenses?: (TripExpense & { paidBy?: Member | null })[];
  settlements?: TripSettlement[];
};

export function serializeTrip(trip: TripWithRelations): TripDto {
  const currency =
    "currency" in trip && typeof trip.currency === "string"
      ? trip.currency
      : "TWD";

  return {
    id: trip.id,
    seedCode: trip.seedCode,
    title: trip.title,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    currency,
    spots: trip.spots.map((spot) => serializeSpot(spot)),
    members: trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    })),
    tasks: (trip.tasks ?? []).map((t) => serializeTask(t, trip.seedCode)),
    expenses: (trip.expenses ?? []).map((e) => serializeExpense(e, currency)),
    settlements: (trip.settlements ?? []).map((s) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amount: Number(s.amount),
      done: s.done,
    })),
  };
}
