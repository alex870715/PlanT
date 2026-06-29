import { getMemberFromRequest } from "@/lib/trip-client-server";
import type { Member } from "@prisma/client";

export type TripActor = {
  memberId: string | null;
  memberName: string;
};

export async function resolveTripActor(
  request: Request,
  members: Pick<Member, "id" | "name">[]
): Promise<TripActor> {
  const memberId = getMemberFromRequest(request);
  if (memberId) {
    const member = members.find((m) => m.id === memberId);
    if (member) return { memberId: member.id, memberName: member.name };
  }
  return { memberId: null, memberName: "匿名" };
}
