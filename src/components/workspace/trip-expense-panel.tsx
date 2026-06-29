"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Loader2,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeMemberBalances,
  perPersonShare,
  suggestSettlements,
} from "@/lib/expense-split";
import { CURRENCIES, formatMoney } from "@/lib/currency";
import { seededFetch } from "@/lib/trip-client";
import type { TripDto } from "@/types/trip";

type TripExpensePanelProps = {
  trip: TripDto;
  onTripUpdate: (trip: TripDto) => void;
};

export function TripExpensePanel({ trip, onTripUpdate }: TripExpensePanelProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState(
    trip.members[0]?.id ?? ""
  );
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(() =>
    trip.members.map((m) => m.id)
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [currencySaving, setCurrencySaving] = useState(false);

  const currency = trip.currency ?? "TWD";
  const fmt = (n: number) => formatMoney(n, currency);

  const memberNameById = useMemo(
    () => new Map(trip.members.map((m) => [m.id, m.name])),
    [trip.members]
  );

  const balances = useMemo(
    () =>
      computeMemberBalances(
        trip.members,
        trip.expenses.map((e) => ({
          id: e.id,
          amount: e.amount,
          paidByMemberId: e.paidByMemberId,
          splitMemberIds: e.splitMemberIds,
        })),
        currency
      ),
    [trip.members, trip.expenses, currency]
  );

  const settlements = useMemo(
    () => suggestSettlements(balances, currency),
    [balances, currency]
  );

  const totalSpent = useMemo(
    () => trip.expenses.reduce((sum, e) => sum + e.amount, 0),
    [trip.expenses]
  );

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  async function changeCurrency(next: string) {
    if (next === currency) return;
    setCurrencySaving(true);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: next }),
      });
      if (res.ok) onTripUpdate(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setCurrencySaving(false);
    }
  }

  function toggleParticipant(memberId: string) {
    setSplitMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  async function addExpense() {
    if (!title.trim() || !paidByMemberId || splitMemberIds.length === 0) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/trip/${trip.seedCode}/expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parsed,
          paidByMemberId,
          splitMemberIds,
          currency,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "新增失敗");
      }
      setTitle("");
      setAmount("");
      await refreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function removeExpense(expenseId: string) {
    setBusyId(expenseId);
    try {
      await fetch(`/api/trip/${trip.seedCode}/expense/${expenseId}`, {
        method: "DELETE",
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  if (trip.members.length === 0) {
    return (
      <section className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 text-sm text-rose-900">
        請先在上方新增團員，才能使用記帳分帳。
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-rose-950">
          <Receipt className="h-4 w-4" />
          記帳 · 分帳
        </h2>
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-md border border-rose-200 bg-white px-1.5 text-xs text-rose-900 disabled:opacity-60"
            value={currency}
            disabled={currencySaving}
            onChange={(e) => void changeCurrency(e.target.value)}
            aria-label="旅程幣別"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-rose-800">總支出 {fmt(totalSpent)}</span>
        </div>
      </div>

      <div className="mb-4 space-y-2 rounded-lg border border-rose-100 bg-white p-3">
        <p className="text-xs font-medium text-rose-900">新增一筆</p>
        <Input
          placeholder="項目（例：晚餐、計程車）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="金額"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm"
          />
          <select
            className="h-9 rounded-md border border-rose-200 bg-white px-2 text-sm"
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
          >
            {trip.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} 先付
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] text-rose-800">參與平分（可取消不參與的人）</p>
          <div className="flex flex-wrap gap-1.5">
            {trip.members.map((m) => {
              const on = splitMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipant(m.id)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    on
                      ? "bg-rose-600 text-white"
                      : "border border-rose-200 bg-white text-rose-800"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
        {amount && splitMemberIds.length > 0 && (
          <p className="text-[11px] text-rose-700">
            每人{" "}
            {fmt(perPersonShare(Number(amount), splitMemberIds.length, currency))}
          </p>
        )}
        <Button
          size="sm"
          className="h-9 w-full bg-rose-600 hover:bg-rose-700"
          disabled={
            adding ||
            !title.trim() ||
            !amount ||
            splitMemberIds.length === 0
          }
          onClick={() => void addExpense()}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              記一筆
            </>
          )}
        </Button>
      </div>

      {trip.expenses.length > 0 && (
        <ul className="mb-4 space-y-2">
          {trip.expenses.map((expense) => {
            const share = perPersonShare(
              expense.amount,
              expense.splitMemberIds.length,
              currency
            );
            const participants = expense.splitMemberIds
              .map((id) => memberNameById.get(id) ?? "?")
              .join("、");

            return (
              <li
                key={expense.id}
                className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-rose-950">{expense.title}</p>
                    <p className="mt-0.5 text-xs text-rose-800">
                      {fmt(expense.amount)} · {expense.paidByName ?? "?"} 先付
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {participants} 平分 · 每人 {fmt(share)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeExpense(expense.id)}
                    disabled={busyId === expense.id}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    aria-label="刪除"
                  >
                    {busyId === expense.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-rose-100 bg-white/80 p-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-bold text-rose-950">
          <Calculator className="h-3.5 w-3.5" />
          結算（先付 − 應付份額）
        </p>
        <ul className="space-y-1.5 text-xs">
          {balances.map((b) => (
            <li
              key={b.memberId}
              className="flex flex-wrap items-center justify-between gap-1 rounded-md bg-rose-50/60 px-2 py-1.5"
            >
              <span className="font-medium text-rose-950">{b.memberName}</span>
              <span className="text-rose-800">
                先付 {fmt(b.paid)} · 份額 {fmt(b.share)} ·{" "}
                <span
                  className={
                    b.balance > 0
                      ? "font-semibold text-emerald-700"
                      : b.balance < 0
                        ? "font-semibold text-red-600"
                        : ""
                  }
                >
                  {b.balance > 0
                    ? `應收 ${fmt(b.balance)}`
                    : b.balance < 0
                      ? `應付 ${fmt(Math.abs(b.balance))}`
                      : "已結清"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {settlements.length > 0 && (
          <div className="mt-3 border-t border-rose-100 pt-3">
            <p className="mb-1.5 text-[11px] font-medium text-rose-900">
              建議轉帳
            </p>
            <ul className="space-y-1 text-xs text-rose-800">
              {settlements.map((t, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="font-medium">{t.fromName}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{t.toName}</span>
                  <span className="ml-1 font-semibold text-rose-950">
                    {fmt(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
