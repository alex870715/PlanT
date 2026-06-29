"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageFile } from "@/lib/image-compress";
import { formatMoney } from "@/lib/currency";
import type { TripDto, TripTaskDto } from "@/types/trip";

type TripTasksPanelProps = {
  trip: TripDto;
  activeMemberId: string | null;
  onTripUpdate: (trip: TripDto) => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  booking: "訂位",
  expense: "分帳",
  other: "其他",
};

const ACCEPT_UPLOAD =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export function TripTasksPanel({
  trip,
  activeMemberId,
  onTripUpdate,
}: TripTasksPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetTaskId, setUploadTargetTaskId] = useState<string | null>(
    null
  );

  const memberNameById = useMemo(
    () => new Map(trip.members.map((m) => [m.id, m.name])),
    [trip.members]
  );

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  function toggleExpanded(taskId: string) {
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
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

  async function updateAssignee(task: TripTaskDto, value: string) {
    setBusyId(task.id);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: value || null }),
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  async function updateNotes(task: TripTaskDto, notes: string) {
    if (notes === (task.notes ?? "")) return;
    setBusyId(task.id);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
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
        body: JSON.stringify({ title: newTitle.trim(), category: "booking" }),
      });
      setNewTitle("");
      await refreshTrip();
    } finally {
      setAdding(false);
    }
  }

  function openUpload(taskId: string) {
    setUploadTargetTaskId(taskId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const taskId = uploadTargetTaskId;
    setUploadTargetTaskId(null);
    if (!file || !taskId) return;

    setUploadingId(taskId);
    try {
      let blob: Blob = file;
      let fileName = file.name;
      let mimeType = file.type;

      if (file.type.startsWith("image/")) {
        const compressed = await compressImageFile(file);
        blob = compressed.blob;
        fileName = compressed.fileName;
        mimeType = compressed.mimeType;
      }

      const formData = new FormData();
      formData.append("file", new File([blob], fileName, { type: mimeType }));
      const uploader = activeMemberId
        ? memberNameById.get(activeMemberId)
        : undefined;
      if (uploader) formData.append("uploadedBy", uploader);

      const res = await fetch(
        `/api/trip/${trip.seedCode}/task/${taskId}/attachment`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "上傳失敗");
      }
      setExpanded((prev) => ({ ...prev, [taskId]: true }));
      await refreshTrip();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploadingId(null);
    }
  }

  async function removeAttachment(taskId: string, attachmentId: string) {
    setBusyId(attachmentId);
    try {
      await fetch(
        `/api/trip/${trip.seedCode}/task/${taskId}/attachment/${attachmentId}`,
        { method: "DELETE" }
      );
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleConfirmation(task: TripTaskDto, memberId: string) {
    const confirmed = task.confirmations.some((c) => c.memberId === memberId);
    setBusyId(`${task.id}-${memberId}`);
    try {
      await fetch(`/api/trip/${trip.seedCode}/task/${task.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, confirmed: !confirmed }),
      });
      await refreshTrip();
    } finally {
      setBusyId(null);
    }
  }

  const doneCount = trip.tasks.filter((t) => t.done).length;

  return (
    <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_UPLOAD}
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ClipboardList className="h-4 w-4" />
          訂位清單
        </h2>
        <span className="text-xs text-amber-800">
          {doneCount}/{trip.tasks.length} 完成
        </span>
      </div>

      {trip.members.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-100 bg-white px-2 py-1.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          {activeMemberId ? (
            <span className="text-xs text-amber-900">
              以{" "}
              <strong>
                {trip.members.find((m) => m.id === activeMemberId)?.name ??
                  "?"}
              </strong>{" "}
              的身份上傳／確認
            </span>
          ) : (
            <span className="text-xs text-amber-800">
              請先在上方團員區按「這是我」綁定身份
            </span>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {trip.tasks.map((task) => {
          const isOpen = !!expanded[task.id];
          const confirmCount = task.confirmations.length;
          const attachCount = task.attachments.length;
          const allConfirmed =
            trip.members.length > 0 &&
            confirmCount >= trip.members.length;

          return (
            <li
              key={task.id}
              className={`rounded-lg border bg-white text-sm ${
                task.done ? "border-emerald-200 opacity-80" : "border-amber-100"
              }`}
            >
              <div className="flex items-start gap-1 px-2 py-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(task.id)}
                  className="mt-0.5 shrink-0 rounded p-1 text-amber-700 hover:bg-amber-50"
                  aria-label={isOpen ? "收合" : "展開"}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

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

                <button
                  type="button"
                  onClick={() => toggleExpanded(task.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p
                    className={`font-medium ${task.done ? "line-through text-muted-foreground" : "text-amber-950"}`}
                  >
                    {task.title}
                    <span className="ml-1 text-[10px] font-normal text-amber-700">
                      {CATEGORY_LABEL[task.category] ?? task.category}
                    </span>
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-amber-700">
                    {task.assignee && <span>負責：{task.assignee}</span>}
                    {task.amount != null && (
                      <span>{formatMoney(task.amount, trip.currency)}</span>
                    )}
                    {attachCount > 0 && (
                      <span className="rounded bg-amber-100 px-1.5">
                        📎 {attachCount} 張
                      </span>
                    )}
                    {confirmCount > 0 && (
                      <span
                        className={`rounded px-1.5 ${
                          allConfirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        ✓ {confirmCount}/{trip.members.length || "?"}
                      </span>
                    )}
                  </div>
                </button>

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

              {isOpen && (
                <div className="space-y-3 border-t border-amber-100 px-3 pb-3 pt-2">
                  <Input
                    placeholder="負責人"
                    className="h-8 text-xs"
                    defaultValue={task.assignee ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (task.assignee ?? "")) {
                        void updateAssignee(task, v);
                      }
                    }}
                  />

                  <textarea
                    placeholder="備註（訂位時間、人數、確認碼…）"
                    className="min-h-[60px] w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs"
                    defaultValue={task.notes ?? ""}
                    onBlur={(e) => void updateNotes(task, e.target.value.trim())}
                  />

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-amber-900">
                        收據 / 截圖
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 border-amber-200 text-xs"
                        disabled={uploadingId === task.id}
                        onClick={() => openUpload(task.id)}
                      >
                        {uploadingId === task.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3 w-3" />
                        )}
                        上傳
                      </Button>
                    </div>

                    {task.attachments.length === 0 ? (
                      <p className="rounded-md border border-dashed border-amber-200 bg-amber-50/50 px-2 py-4 text-center text-[11px] text-amber-700">
                        上傳訂位確認信、收據或截圖，讓大家核對
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {task.attachments.map((att) => (
                          <li
                            key={att.id}
                            className="group relative overflow-hidden rounded-lg border border-amber-100 bg-amber-50/30"
                          >
                            {att.mimeType.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.fileName}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            ) : (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-white px-2 text-center"
                              >
                                <FileText className="h-8 w-8 text-amber-600" />
                                <span className="line-clamp-2 text-[10px] text-amber-900">
                                  {att.fileName}
                                </span>
                              </a>
                            )}
                            <div className="px-1.5 py-1 text-[9px] text-amber-700">
                              {att.uploadedBy ? `${att.uploadedBy} 上傳` : "已上傳"}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void removeAttachment(task.id, att.id)
                              }
                              disabled={busyId === att.id}
                              className="absolute right-1 top-1 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="刪除附件"
                            >
                              {busyId === att.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {trip.members.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-amber-900">
                        團員確認
                        {allConfirmed && (
                          <span className="ml-1 font-normal text-emerald-700">
                            · 全員已確認
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.members.map((m) => {
                          const confirmed = task.confirmations.some(
                            (c) => c.memberId === m.id
                          );
                          const busy = busyId === `${task.id}-${m.id}`;
                          const isSelf = m.id === activeMemberId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void toggleConfirmation(task, m.id)
                              }
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                                confirmed
                                  ? "bg-emerald-600 text-white"
                                  : isSelf
                                    ? "border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                    : "border border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                              }`}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : confirmed ? (
                                <Check className="h-3 w-3" />
                              ) : null}
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        點自己的名稱打勾表示已看過收據／訂位資訊
                      </p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="新增訂位待辦…"
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
