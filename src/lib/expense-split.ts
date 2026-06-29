import { roundMoney as roundByCurrency } from "@/lib/currency";

export type ExpenseForSplit = {
  id: string;
  amount: number;
  paidByMemberId: string;
  splitMemberIds: string[];
};

export type MemberBalance = {
  memberId: string;
  memberName: string;
  paid: number;
  share: number;
  balance: number;
};

export type SettlementTransfer = {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
};

function makeRounder(currency: string) {
  return (n: number) => roundByCurrency(n, currency);
}

export function perPersonShare(
  amount: number,
  participantCount: number,
  currency = "TWD"
): number {
  if (participantCount <= 0) return 0;
  return roundByCurrency(amount / participantCount, currency);
}

/** 先付的人記入 paid；參與者平分 share；balance = paid - share（正＝應收回） */
export function computeMemberBalances(
  members: { id: string; name: string }[],
  expenses: ExpenseForSplit[],
  currency = "TWD"
): MemberBalance[] {
  const roundMoney = makeRounder(currency);
  const rows = new Map(
    members.map((m) => [
      m.id,
      { memberId: m.id, memberName: m.name, paid: 0, share: 0, balance: 0 },
    ])
  );

  for (const expense of expenses) {
    const participants =
      expense.splitMemberIds.length > 0
        ? expense.splitMemberIds
        : members.map((m) => m.id);
    if (participants.length === 0) continue;

    const each = expense.amount / participants.length;
    const payer = rows.get(expense.paidByMemberId);
    if (payer) payer.paid += expense.amount;

    for (const memberId of participants) {
      const row = rows.get(memberId);
      if (row) row.share += each;
    }
  }

  return members.map((m) => {
    const row = rows.get(m.id)!;
    return {
      memberId: row.memberId,
      memberName: row.memberName,
      paid: roundMoney(row.paid),
      share: roundMoney(row.share),
      balance: roundMoney(row.paid - row.share),
    };
  });
}

/** 簡化結算：誰該付誰多少 */
export function suggestSettlements(
  balances: MemberBalance[],
  currency = "TWD"
): SettlementTransfer[] {
  const roundMoney = makeRounder(currency);
  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b, remaining: roundMoney(-b.balance) }));
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ ...b, remaining: roundMoney(b.balance) }));

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = roundMoney(
      Math.min(debtors[i].remaining, creditors[j].remaining)
    );
    if (amount > 0) {
      transfers.push({
        fromMemberId: debtors[i].memberId,
        fromName: debtors[i].memberName,
        toMemberId: creditors[j].memberId,
        toName: creditors[j].memberName,
        amount,
      });
    }
    debtors[i].remaining = roundMoney(debtors[i].remaining - amount);
    creditors[j].remaining = roundMoney(creditors[j].remaining - amount);
    if (debtors[i].remaining <= 0.005) i += 1;
    if (creditors[j].remaining <= 0.005) j += 1;
  }

  return transfers;
}
