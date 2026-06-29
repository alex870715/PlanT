"use client";

import { useMemo } from "react";
import { Clock, User } from "lucide-react";
import { ACTIVITY_LABELS } from "@/lib/trip-activity";
import type { TripActivityDto } from "@/types/trip";

type ActivityPanelProps = {
  activities: TripActivityDto[];
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityPanel({ activities }: ActivityPanelProps) {
  const items = useMemo(() => activities.slice(0, 12), [activities]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
        尚無操作紀錄。綁定身份後，編輯景點、記帳、上傳收據等動作會顯示在這裡。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Clock className="h-4 w-4 text-slate-500" />
        最近操作
      </h3>
      <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-baseline gap-x-1.5 rounded-md bg-slate-50 px-2 py-1"
          >
            <span className="shrink-0 text-[10px] text-slate-500">
              {formatTime(a.createdAt)}
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-800">
              <User className="h-3 w-3" />
              {a.memberName}
            </span>
            <span className="text-slate-700">
              {ACTIVITY_LABELS[a.action] ?? a.action}
              {a.detail ? `：${a.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
