import type { Member, TripExpense } from "@prisma/client";
import { roundMoney } from "@/lib/currency";
import type { TripExpenseDto } from "@/types/trip";

export function parseSplitMemberIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function serializeExpense(
  expense: TripExpense & { paidBy?: Member | null },
  baseCurrency = "TWD"
): TripExpenseDto {
  const amount = Number(expense.amount);
  // 舊資料可能沒有這兩欄，給安全預設
  const currency =
    "currency" in expense && typeof expense.currency === "string"
      ? expense.currency
      : baseCurrency;
  const exchangeRate =
    "exchangeRate" in expense && expense.exchangeRate != null
      ? Number(expense.exchangeRate)
      : 1;
  const baseAmount = roundMoney(amount * exchangeRate, baseCurrency);

  return {
    id: expense.id,
    title: expense.title,
    amount,
    currency,
    exchangeRate,
    baseAmount,
    paidByMemberId: expense.paidByMemberId,
    paidByName: expense.paidBy?.name ?? null,
    splitMemberIds: parseSplitMemberIds(expense.splitMemberIds),
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
  };
}
