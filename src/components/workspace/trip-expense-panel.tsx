"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Check,
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
import { CURRENCIES, formatMoney, roundMoney } from "@/lib/currency";
import { seededFetch } from "@/lib/trip-client";
import type { TripDto } from "@/types/trip";

function settlementKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

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
  const [settleBusy, setSettleBusy] = useState<string | null>(null);

  const currency = trip.currency ?? "TWD";
  const fmt = (n: number) => formatMoney(n, currency);

  // 新增花費時可指定該筆實際支付幣別與匯率（換算成旅程基準幣別）
  const [expenseCurrency, setExpenseCurrency] = useState(currency);
  const [rate, setRate] = useState("");
  const foreign = expenseCurrency !== currency;

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
          amount: e.baseAmount,
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
    () => trip.expenses.reduce((sum, e) => sum + e.baseAmount, 0),
    [trip.expenses]
  );

  // 已完成轉帳：以 from→to 為 key，且金額需與目前建議相符才算數
  const settledByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of trip.settlements ?? []) {
      if (s.done) map.set(settlementKey(s.fromMemberId, s.toMemberId), s.amount);
    }
    return map;
  }, [trip.settlements]);

  function isSettled(fromId: string, toId: string, amount: number): boolean {
    const recorded = settledByKey.get(settlementKey(fromId, toId));
    if (recorded == null) return false;
    return roundMoney(recorded, currency) === roundMoney(amount, currency);
  }

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

    const exchangeRate = foreign ? Number(rate) : 1;
    if (foreign && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      return;
    }

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
          currency: expenseCurrency,
          exchangeRate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "新增失敗");
      }
      setTitle("");
      setAmount("");
      setRate("");
      setExpenseCurrency(currency);
      await refreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function toggleSettlement(
    fromId: string,
    toId: string,
    amount: number,
    nextDone: boolean
  ) {
    const key = settlementKey(fromId, toId);
    setSettleBusy(key);
    try {
      const res = await fetch(`/api/trip/${trip.seedCode}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId: fromId,
          toMemberId: toId,
          amount,
          done: nextDone,
        }),
      });
      if (res.ok) await refreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setSettleBusy(null);
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
        <div className="grid grid-cols-[1fr_auto] gap-2">
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
            value={expenseCurrency}
            onChange={(e) => setExpenseCurrency(e.target.value)}
            aria-label="此筆花費幣別"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {foreign && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5">
            <Input
              placeholder={`1 ${expenseCurrency} = ? ${currency}`}
              type="number"
              min={0}
              step="any"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="h-8 text-sm"
            />
            <span className="whitespace-nowrap text-[11px] text-amber-800">
              {amount && rate
                ? `≈ ${fmt(Number(amount) * Number(rate))}`
                : `匯率 → ${currency}`}
            </span>
          </div>
        )}

        <select
          className="h-9 w-full rounded-md border border-rose-200 bg-white px-2 text-sm"
          value={paidByMemberId}
          onChange={(e) => setPaidByMemberId(e.target.value)}
        >
          {trip.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} 先付
            </option>
          ))}
        </select>
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
        {amount && splitMemberIds.length > 0 && (!foreign || rate) && (
          <p className="text-[11px] text-rose-700">
            每人{" "}
            {fmt(
              perPersonShare(
                Number(amount) * (foreign ? Number(rate) || 0 : 1),
                splitMemberIds.length,
                currency
              )
            )}
          </p>
        )}
        <Button
          size="sm"
          className="h-9 w-full bg-rose-600 hover:bg-rose-700"
          disabled={
            adding ||
            !title.trim() ||
            !amount ||
            splitMemberIds.length === 0 ||
            (foreign && !rate)
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
            const isForeign = expense.currency !== currency;
            const share = perPersonShare(
              expense.baseAmount,
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
                      {isForeign
                        ? `${formatMoney(expense.amount, expense.currency)} → ${fmt(expense.baseAmount)}`
                        : fmt(expense.baseAmount)}{" "}
                      · {expense.paidByName ?? "?"} 先付
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
              建議轉帳（轉完打勾）
            </p>
            <ul className="space-y-1.5 text-xs text-rose-800">
              {settlements.map((t) => {
                const key = settlementKey(t.fromMemberId, t.toMemberId);
                const done = isSettled(t.fromMemberId, t.toMemberId, t.amount);
                const busy = settleBusy === key;
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      done ? "bg-emerald-50" : "bg-rose-50/60"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void toggleSettlement(
                          t.fromMemberId,
                          t.toMemberId,
                          t.amount,
                          !done
                        )
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-rose-300 bg-white hover:bg-rose-50"
                      }`}
                      aria-label={done ? "標為未轉帳" : "標為已轉帳"}
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                    <span
                      className={`flex flex-1 flex-wrap items-center gap-1 ${
                        done ? "text-emerald-800 line-through" : ""
                      }`}
                    >
                      <span className="font-medium">{t.fromName}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="font-medium">{t.toName}</span>
                      <span className="ml-1 font-semibold text-rose-950">
                        {fmt(t.amount)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
