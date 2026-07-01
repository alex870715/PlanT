import type { TripActivityLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TripActivityDto } from "@/types/trip";

export type LogActivityInput = {
  tripId: string;
  memberId?: string | null;
  memberName: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
};

/** 更新 Trip.updatedAt，供輪詢同步偵測變更 */
export async function touchTrip(tripId: string): Promise<Date> {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { updatedAt: new Date() },
    select: { updatedAt: true },
  });
  return trip.updatedAt;
}

export async function logTripActivity(input: LogActivityInput): Promise<void> {
  await prisma.$transaction([
    prisma.tripActivityLog.create({
      data: {
        tripId: input.tripId,
        memberId: input.memberId || null,
        memberName: input.memberName,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        detail: input.detail ?? null,
      },
    }),
    prisma.trip.update({
      where: { id: input.tripId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export function serializeActivity(log: TripActivityLog): TripActivityDto {
  return {
    id: log.id,
    memberId: log.memberId,
    memberName: log.memberName,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    detail: log.detail,
    createdAt: log.createdAt.toISOString(),
  };
}

export const ACTIVITY_LABELS: Record<string, string> = {
  spot_update: "編輯景點",
  spot_delete: "刪除景點",
  spot_graft: "嫁接支線",
  spot_reorder: "調整順序",
  spot_add: "新增景點",
  expense_add: "新增花費",
  expense_delete: "刪除花費",
  task_update: "更新待辦",
  task_attachment: "上傳附件",
  member_add: "新增團員",
  member_update: "更新團員",
  member_remove: "移除團員",
  presence_update: "更新狀態",
  currency_change: "變更幣別",
  trip_fork: "複製旅程",
};
