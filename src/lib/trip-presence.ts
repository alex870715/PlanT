import type { TripMemberPresence } from "@prisma/client";
import type { TripMemberPresenceDto } from "@/types/trip";

export const PRESENCE_STATUSES = ["idle", "on_way", "arrived", "late"] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  idle: "未回報",
  on_way: "出發中",
  arrived: "到了",
  late: "晚到",
};

export function isPresenceStatus(v: string): v is PresenceStatus {
  return (PRESENCE_STATUSES as readonly string[]).includes(v);
}

export function serializePresence(p: TripMemberPresence): TripMemberPresenceDto {
  return {
    memberId: p.memberId,
    memberName: p.memberName,
    status: p.status as PresenceStatus,
    lateMinutes: p.lateMinutes,
    spotId: p.spotId,
    message: p.message,
    updatedAt: p.updatedAt.toISOString(),
  };
}
