"use client";

import { useState } from "react";
import { Check, ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TripDto, TripTaskDto } from "@/types/trip";

type TripTasksPanelProps = {
  trip: TripDto;
  onTripUpdate: (trip: TripDto) => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  booking: "訂位",
  expense: "分帳",
  other: "其他",
};

export function TripTasksPanel({ trip, onTripUpdate }: TripTasksPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  async function toggleTask(task: TripTaskDto) {
    setBusyId(task.id);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  async function updateField(
    task: TripTaskDto,
    field: "assignee" | "amount",
    value: string
  ) {
    setBusyId(task.id);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "amount"
            ? { amount: value === "" ? null : Number(value) }
            : { assignee: value || null }
        ),
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId: string) {
    setBusyId(taskId);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${taskId}`, {
        method: "DELETE",
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), category: "other" }),
      });
      setNewTitle("");
      await refreshTrip();
    } finally {
      setAdding(false);
    }
  }

  const doneCount = trip.tasks.filter((t) => t.done).length;

  return (
    <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ClipboardList className="h-4 w-4" />
          訂位 · 分帳清單
        </h2>
        <span className="text-xs text-amber-800">
          {doneCount}/{trip.tasks.length} 完成
        </span>
      </div>

      <ul className="space-y-2">
        {trip.tasks.map((task) => (
          <li
            key={task.id}
            className={`rounded-lg border bg-white px-3 py-2 text-sm ${
              task.done ? "border-emerald-200 opacity-70" : "border-amber-100"
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => void toggleTask(task)}
                disabled={busyId === task.id}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  task.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-amber-300 hover:bg-amber-50"
                }`}
                aria-label={task.done ? "標為未完成" : "標為完成"}
              >
                {busyId === task.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : task.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {task.title}
                  <span className="ml-1 text-[10px] font-normal text-amber-700">
                    {CATEGORY_LABEL[task.category] ?? task.category}
                  </span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Input
                    placeholder="負責人"
                    className="h-8 max-w-[7rem] text-xs"
                    defaultValue={task.assignee ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (task.assignee ?? "")) {
                        void updateField(task, "assignee", v);
                      }
                    }}
                  />
                  <Input
                    placeholder="金額"
                    type="number"
                    className="h-8 max-w-[5.5rem] text-xs"
                    defaultValue={task.amount ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      const prev =
                        task.amount == null ? "" : String(task.amount);
                      if (v !== prev) void updateField(task, "amount", v);
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeTask(task.id)}
                disabled={busyId === task.id}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                aria-label="刪除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="新增待辦…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addTask()}
          className="h-9 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void addTask()}
          disabled={adding || !newTitle.trim()}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </section>
  );
}
