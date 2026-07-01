"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Lock, Pencil, Plus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAuthStatus,
  getLoginUrl,
  seededFetch,
  setActiveMemberId,
} from "@/lib/trip-client";
import type { MemberDto, TripDto } from "@/types/trip";

type MembersPanelProps = {
  trip: TripDto;
  activeMemberId: string | null;
  canEdit: boolean;
  isHost: boolean;
  onIdentityChange: (memberId: string | null) => void;
  onTripUpdate: (trip: TripDto) => void;
  onAuthRefresh?: () => void;
};

export function MembersPanel({
  trip,
  activeMemberId,
  canEdit,
  isHost,
  onIdentityChange,
  onTripUpdate,
  onAuthRefresh,
}: MembersPanelProps) {
  const { data: session } = useSession();
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (session?.user?.name && !joinName) {
      setJoinName(session.user.name);
    }
  }, [session?.user?.name, joinName]);

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  async function handleJoinTrip() {
    if (!session) {
      window.location.href = getLoginUrl(`/trip/${trip.seedCode}`);
      return;
    }
    if (!joinName.trim()) {
      alert("請輸入你在這趟旅程的名字");
      return;
    }
    setJoining(true);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "加入失敗");
        return;
      }
      setActiveMemberId(data.memberId);
      onIdentityChange(data.memberId);
      await refreshTrip();
      await fetchAuthStatus(trip.seedCode);
      onAuthRefresh?.();
    } catch (e) {
      console.error(e);
      alert("加入失敗");
    } finally {
      setJoining(false);
    }
  }

  async function handleAddMember() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("新增失敗");
      setNewName("");
      await refreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveMember(memberId: string) {
    if (!editName.trim()) return;
    try {
      const res = await seededFetch(`/api/member/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setEditingId(null);
      await refreshTrip();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRemoveMember(member: MemberDto) {
    if (!confirm(`移除參與者「${member.name}」？`)) return;
    try {
      const res = await seededFetch(`/api/member/${member.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "無法移除");
        return;
      }
      if (activeMemberId === member.id) {
        setActiveMemberId(null);
        onIdentityChange(null);
      }
      await refreshTrip();
      onAuthRefresh?.();
    } catch (e) {
      console.error(e);
    }
  }

  const boundMember = activeMemberId
    ? trip.members.find((m) => m.id === activeMemberId)
    : null;
  const hasJoined = canEdit && !!boundMember;

  return (
    <div className="rounded-xl border border-emerald-200 bg-white/90 px-4 py-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
          <User className="h-4 w-4 text-emerald-600" />
          參與人 ({trip.members.length})
        </h3>
        {hasJoined ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
            <Check className="h-3 w-3" />
            你是 {boundMember.name}
          </span>
        ) : session ? (
          <span className="text-[11px] text-amber-700">請輸入名字加入旅程</span>
        ) : (
          <Link
            href={getLoginUrl(`/trip/${trip.seedCode}`)}
            className="text-[11px] font-medium text-emerald-700 underline"
          >
            登入後加入
          </Link>
        )}
      </div>

      {session && !canEdit && (
        <div
          id="join-trip-form"
          className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3"
        >
          <Input
            placeholder="你在這趟旅程的名字"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleJoinTrip()}
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            className="h-9 shrink-0"
            disabled={joining || !joinName.trim()}
            onClick={() => void handleJoinTrip()}
          >
            加入旅程
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {trip.members.map((member) => {
          const isMe = activeMemberId === member.id;
          const isOtherAccount = !!member.userId && !isMe;

          return (
            <div
              key={member.id}
              className={`flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-sm ${
                isMe
                  ? "border-emerald-500 bg-emerald-100 ring-1 ring-emerald-400"
                  : isOtherAccount
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-emerald-200 bg-emerald-50/80"
              }`}
            >
              {editingId === member.id ? (
                <>
                  <Input
                    className="h-7 w-24 border-0 bg-transparent px-1 text-sm shadow-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveMember(member.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => handleSaveMember(member.id)}
                  >
                    ✓
                  </button>
                </>
              ) : (
                <>
                  <span className={isMe ? "font-medium text-emerald-900" : ""}>
                    {member.name}
                  </span>
                  {member.isHost && (
                    <span className="text-[10px] text-amber-700" title="主辦人">
                      ★
                    </span>
                  )}
                  {isOtherAccount && (
                    <span title="已加入">
                      <Lock className="h-3 w-3 text-slate-400" aria-hidden />
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[10px] text-emerald-600">我</span>
                  )}
                  {canEdit && isMe && (
                    <button
                      type="button"
                      className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
                      onClick={() => {
                        setEditingId(member.id);
                        setEditName(member.name);
                      }}
                      aria-label="編輯"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {canEdit && isHost && !isMe && (
                    <button
                      type="button"
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveMember(member)}
                      aria-label="移除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="新增參與人（僅名稱，供規劃用）…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddMember}
            disabled={adding || !newName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
