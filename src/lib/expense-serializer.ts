import type { Member, TripExpense } from "@prisma/client";
import type { TripExpenseDto } from "@/types/trip";

export function parseSplitMemberIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function serializeExpense(
  expense: TripExpense & { paidBy?: Member | null }
): TripExpenseDto {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    paidByMemberId: expense.paidByMemberId,
    paidByName: expense.paidBy?.name ?? null,
    splitMemberIds: parseSplitMemberIds(expense.splitMemberIds),
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
  };
}
