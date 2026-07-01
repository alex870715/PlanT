"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Copy,
  Link2,
  LogIn,
  LogOut,
  Shield,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAuthStatus,
  getLoginUrl,
  getViewLink,
  seededFetch,
  setActiveMemberId,
  setActiveRole,
  type TripRole,
} from "@/lib/trip-client";
import type { TripDto } from "@/types/trip";

type TripAuthBarProps = {
  trip: TripDto;
  role: TripRole;
  canEdit: boolean;
  onAuthChange: (role: TripRole, canEdit: boolean, memberId: string | null) => void;
};

export function TripAuthBar({
  trip,
  role,
  canEdit,
  onAuthChange,
}: TripAuthBarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!canEdit);
  const [forkHostName, setForkHostName] = useState("");
  const [forking, setForking] = useState(false);

  const refreshAuth = useCallback(async () => {
    const auth = await fetchAuthStatus(trip.seedCode);
    if (auth) {
      setActiveRole(auth.role);
      setActiveMemberId(auth.linkedMemberId);
      onAuthChange(auth.role, auth.canEdit, auth.linkedMemberId);
    }
  }, [trip.seedCode, onAuthChange]);

  useEffect(() => {
    if (status === "authenticated") {
      void refreshAuth();
    }
  }, [status, refreshAuth]);

  useEffect(() => {
    if (session?.user?.name && !forkHostName) {
      setForkHostName(session.user.name);
    }
  }, [session?.user?.name, forkHostName]);

  function copyViewLink() {
    void navigator.clipboard.writeText(getViewLink(trip.seedCode));
    setMessage("已複製連結（對方可開啟後登入加入）");
  }

  async function handleForkTrip() {
    if (!session) {
      window.location.href = getLoginUrl(`/trip/${trip.seedCode}`);
      return;
    }
    const hostName = forkHostName.trim() || session.user?.name?.trim();
    if (!hostName) {
      alert("請輸入你的名字（將成為主辦人）");
      return;
    }
    if (
      !confirm(
        "將複製此旅程的主線行程與訂位待辦為全新旅程。\n\n不會包含原團員、個人支線與記帳紀錄。\n你會成為主辦人，可分享新 Seed 邀請大家加入。\n\n確定複製？"
      )
    ) {
      return;
    }

    setForking(true);
    setMessage(null);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "複製失敗");
        return;
      }
      router.push(`/trip/${data.seedCode}`);
    } catch (e) {
      console.error(e);
      alert("複製失敗");
    } finally {
      setForking(false);
    }
  }

  const roleLabel =
    role === "host"
      ? "主辦人"
      : role === "member"
        ? "團員（已加入）"
        : session
          ? "已登入，請輸入名字加入"
          : "僅檢視";

  const showFork = session && role !== "host";

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {canEdit ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <Shield className="h-4 w-4 text-amber-600" />
          )}
          <span className="text-sm font-semibold text-sky-950">
            存取：{roleLabel}
          </span>
          {session?.user?.email && (
            <span className="text-[11px] text-sky-700">{session.user.email}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!session ? (
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href={getLoginUrl(`/trip/${trip.seedCode}`)}>
                <LogIn className="h-3.5 w-3.5" />
                登入
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              onClick={() => void signOut({ callbackUrl: `/trip/${trip.seedCode}` })}
            >
              <LogOut className="h-3.5 w-3.5" />
              登出
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-sky-800"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "收合" : "說明"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-sky-200 pt-3 text-sm">
          {!canEdit && (
            <p className="text-xs text-amber-900">
              {session
                ? "可加入此旅程一起編輯，或複製成自己的新旅程（你當主辦、邀請朋友）。"
                : "有 Seed 的人預設只能看。登入後可加入或複製成自己的旅程。"}
            </p>
          )}

          {role === "host" && (
            <p className="text-xs text-emerald-900">
              你是主辦人：分享下方連結，朋友登入後輸入名字即可加入；可在參與人區塊移除團員。
            </p>
          )}

          {showFork && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-violet-950">
                <Sprout className="h-3.5 w-3.5" />
                複製成我的旅程
              </p>
              <p className="text-[11px] text-violet-800/90">
                複製主線行程與訂位待辦，產生新 Seed。不含原團員、支線與記帳；你為主辦人。
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="主辦人名字"
                  value={forkHostName}
                  onChange={(e) => setForkHostName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={forking || !forkHostName.trim()}
                  onClick={() => void handleForkTrip()}
                >
                  {forking ? "建立中…" : "複製"}
                </Button>
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-sky-300"
            onClick={copyViewLink}
          >
            <Link2 className="h-3.5 w-3.5" />
            複製旅程連結
          </Button>
          {message && (
            <p className="flex items-center gap-1 text-xs text-sky-800">
              <Copy className="h-3 w-3 opacity-50" />
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
