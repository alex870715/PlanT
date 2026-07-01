import type {
  Member,
  Spot,
  Trip,
  TripActivityLog,
  TripExpense,
  TripMemberPresence,
  TripSettlement,
  TripTask,
} from "@prisma/client";
import { serializeExpense } from "@/lib/expense-serializer";
import { serializeSpot } from "@/lib/spot-serializer";
import { serializeTask } from "@/lib/task-serializer";
import { serializeActivity } from "@/lib/trip-activity";
import { serializePresence } from "@/lib/trip-presence";
import { resolveHostMemberId } from "@/lib/trip-host";
import type { TripDto } from "@/types/trip";

type TripWithRelations = Trip & {
  spots: (Spot & { member: Member | null })[];
  members: Member[];
  tasks?: TripTask[];
  expenses?: (TripExpense & { paidBy?: Member | null })[];
  settlements?: TripSettlement[];
  activities?: TripActivityLog[];
  presences?: TripMemberPresence[];
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
    updatedAt: trip.updatedAt.toISOString(),
    spots: trip.spots.map((spot) => serializeSpot(spot)),
    members: trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      emailVerified:
        "emailVerifiedAt" in m ? !!m.emailVerifiedAt : undefined,
      isHost: "isHost" in m ? m.isHost : undefined,
      userId: "userId" in m ? m.userId : undefined,
      isClaimed: "userId" in m ? !!m.userId : undefined,
    })),
    tasks: (trip.tasks ?? []).map((t) => serializeTask(t, trip.seedCode)),
    expenses: (trip.expenses ?? []).map((e) => serializeExpense(e, currency)),
    settlements: (trip.settlements ?? []).map((s) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amount: Number(s.amount),
      done: s.done,
    })),
    activities: (trip.activities ?? []).map(serializeActivity),
    presences: (trip.presences ?? []).map(serializePresence),
    auth: {
      hostMemberId: resolveHostMemberId(
        "hostMemberId" in trip ? trip.hostMemberId : null,
        trip.members.map((m) => ({
          id: m.id,
          isHost: "isHost" in m ? m.isHost : undefined,
        }))
      ),
      hostUserId:
        "hostUserId" in trip && typeof trip.hostUserId === "string"
          ? trip.hostUserId
          : null,
      hostEmail:
        "hostEmail" in trip && typeof trip.hostEmail === "string"
          ? trip.hostEmail
          : null,
    },
  };
}
