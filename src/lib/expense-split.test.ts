import { describe, expect, it } from "vitest";
import {
  computeMemberBalances,
  perPersonShare,
  suggestSettlements,
} from "./expense-split";

const members = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Carol" },
];

describe("expense-split", () => {
  it("perPersonShare 依幣別小數位數", () => {
    expect(perPersonShare(1000, 3, "JPY")).toBe(333);
    expect(perPersonShare(10, 3, "USD")).toBeCloseTo(3.33, 5);
    expect(perPersonShare(100, 0)).toBe(0);
  });

  it("computeMemberBalances 先付者應收回份額", () => {
    const balances = computeMemberBalances(
      members,
      [
        {
          id: "e1",
          amount: 900,
          paidByMemberId: "a",
          splitMemberIds: ["a", "b", "c"],
        },
      ],
      "JPY"
    );
    const alice = balances.find((b) => b.memberId === "a")!;
    expect(alice.paid).toBe(900);
    expect(alice.share).toBe(300);
    expect(alice.balance).toBe(600);
    const bob = balances.find((b) => b.memberId === "b")!;
    expect(bob.balance).toBe(-300);
  });

  it("suggestSettlements 產生平衡轉帳", () => {
    const balances = computeMemberBalances(
      members,
      [
        {
          id: "e1",
          amount: 900,
          paidByMemberId: "a",
          splitMemberIds: ["a", "b", "c"],
        },
      ],
      "JPY"
    );
    const transfers = suggestSettlements(balances, "JPY");
    const totalToAlice = transfers
      .filter((t) => t.toMemberId === "a")
      .reduce((s, t) => s + t.amount, 0);
    expect(totalToAlice).toBe(600);
    expect(transfers.every((t) => t.amount > 0)).toBe(true);
  });
});
