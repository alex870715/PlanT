"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Copy,
  Heart,
  Loader2,
  LogIn,
  PlusCircle,
  Sparkles,
  ThumbsDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ExitingSwipeCard,
  SwipeCard,
} from "@/components/discover/swipe-card";
import { TripDateFields } from "@/components/trip-date-fields";
import { DESTINATIONS } from "@/lib/discover/catalog";
import {
  getDefaultTripDateRange,
  getDefaultVotingDeadline,
  tripRangeToIso,
  validateTripDateRange,
  validateVotingDeadline,
} from "@/lib/trip-dates";
import type { DiscoverCard, DiscoverDestination } from "@/types/discover";

type FlowMode = "solo" | "create" | "join";
type MatchPhase = "voting" | "closed" | "planted";
type Step = "landing" | "swipe" | "summary" | "planting";

type RoomMeta = {
  phase: MatchPhase;
  votingOpen: boolean;
  votingEndsAt: string;
  hostName: string;
  plantedSeedCode: string | null;
};

function initialTripDates(searchParams: URLSearchParams) {
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (start && end && validateTripDateRange(start, end) === null) {
    return { start, end };
  }
  return getDefaultTripDateRange();
}

function initialFlowMode(searchParams: URLSearchParams): FlowMode {
  const mode = searchParams.get("mode");
  if (mode === "join" || searchParams.get("room")) return "join";
  if (mode === "solo") return "solo";
  if (mode === "create") return "create";
  return "create";
}

function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DiscoverFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flowMode, setFlowMode] = useState<FlowMode>(() =>
    initialFlowMode(searchParams)
  );
  const [tripStart, setTripStart] = useState(() =>
    initialTripDates(searchParams).start
  );
  const [tripEnd, setTripEnd] = useState(() =>
    initialTripDates(searchParams).end
  );
  const [votingDeadline, setVotingDeadline] = useState(getDefaultVotingDeadline);
  const [step, setStep] = useState<Step>("landing");
  const [destinationInput, setDestinationInput] = useState("福岡");
  const [meta, setMeta] = useState<DiscoverDestination | null>(null);
  const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
  const [deck, setDeck] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<DiscoverCard[]>([]);
  const [passed, setPassed] = useState<DiscoverCard[]>([]);
  const [groupLiked, setGroupLiked] = useState<DiscoverCard[]>([]);
  const [voterCount, setVoterCount] = useState(0);
  const [exiting, setExiting] = useState<{
    card: DiscoverCard;
    dir: "left" | "right";
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [roomCode, setRoomCode] = useState(() =>
    normalizeRoomCode(searchParams.get("room") ?? "")
  );
  const [roomCodeInput, setRoomCodeInput] = useState(roomCode);
  const [countdownLabel, setCountdownLabel] = useState("");

  const isGroup = flowMode === "create" || flowMode === "join";
  const current = deck[index];
  const progress = deck.length ? index / deck.length : 0;
  const phase = roomMeta?.phase;
  const votingOpen = roomMeta?.votingOpen ?? false;
  const canPlantGroup =
    isGroup &&
    phase === "closed" &&
    groupLiked.length > 0 &&
    !roomMeta?.plantedSeedCode;

  const applyRoomPayload = useCallback(
    (data: {
      destination: DiscoverDestination;
      groupLiked?: DiscoverCard[];
      voterCount?: number;
      phase: MatchPhase;
      votingOpen: boolean;
      votingEndsAt: string;
      hostName: string;
      plantedSeedCode: string | null;
    }) => {
      setMeta(data.destination);
      setGroupLiked(data.groupLiked ?? []);
      setVoterCount(data.voterCount ?? 0);
      setRoomMeta({
        phase: data.phase,
        votingOpen: data.votingOpen,
        votingEndsAt: data.votingEndsAt,
        hostName: data.hostName,
        plantedSeedCode: data.plantedSeedCode,
      });
    },
    []
  );

  const loadRoom = useCallback(
    async (code: string) => {
      const res = await fetch(`/api/match/room/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "載入房間失敗");
      applyRoomPayload(data);
      return data as {
        destination: DiscoverDestination;
        groupLiked: DiscoverCard[];
        voterCount: number;
        phase: MatchPhase;
        votingOpen: boolean;
        votingEndsAt: string;
        hostName: string;
        plantedSeedCode: string | null;
        redirectUrl?: string;
      };
    },
    [applyRoomPayload]
  );

  const refreshRoomDeck = useCallback(
    async (code: string) => {
      const res = await fetch(`/api/match/room/${code}/deck`);
      const data = await res.json();
      if (res.status === 403) {
        const err = new Error(data.error ?? "投票已截止") as Error & {
          votingClosed?: boolean;
        };
        err.votingClosed = true;
        throw err;
      }
      if (!res.ok) throw new Error(data.error ?? "載入房間失敗");
      setMeta(data.destination);
      setDeck(data.cards);
      setVoterCount(data.voterCount ?? 0);
      setRoomMeta({
        phase: data.phase,
        votingOpen: data.votingOpen,
        votingEndsAt: data.votingEndsAt,
        hostName: data.hostName,
        plantedSeedCode: roomMeta?.plantedSeedCode ?? null,
      });
      return data;
    },
    [roomMeta?.plantedSeedCode]
  );

  const goToGroupSummary = useCallback(
    async (code: string) => {
      await loadRoom(code);
      setStep("summary");
    },
    [loadRoom]
  );

  useEffect(() => {
    if (!isGroup || !roomMeta?.votingEndsAt || step === "landing") return;

    const tick = () => {
      const left = new Date(roomMeta.votingEndsAt).getTime() - Date.now();
      if (left <= 0) {
        setCountdownLabel("投票已截止");
        if (roomMeta.votingOpen && roomCode) {
          void goToGroupSummary(roomCode);
        }
        return;
      }
      const h = Math.floor(left / 3_600_000);
      const m = Math.floor((left % 3_600_000) / 60_000);
      setCountdownLabel(h > 0 ? `剩 ${h} 小時 ${m} 分` : `剩 ${m} 分鐘`);
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [isGroup, roomMeta, step, roomCode, goToGroupSummary]);

  useEffect(() => {
    if (step !== "swipe" && step !== "summary") return;
    if (!isGroup || !roomCode) return;

    const poll = async () => {
      try {
        if (step === "swipe" && votingOpen) {
          await refreshRoomDeck(roomCode);
        } else {
          await loadRoom(roomCode);
        }
      } catch (e) {
        const err = e as Error & { votingClosed?: boolean };
        if (err.votingClosed) await goToGroupSummary(roomCode);
      }
    };

    const id = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(id);
  }, [
    step,
    isGroup,
    roomCode,
    votingOpen,
    refreshRoomDeck,
    loadRoom,
    goToGroupSummary,
  ]);

  async function createRoom(dest?: string) {
    const q = (dest ?? destinationInput).trim();
    if (!q) return;
    if (!memberName.trim()) {
      setError("請填寫你的名字（發起人）");
      return;
    }
    const dateError = validateTripDateRange(tripStart, tripEnd);
    if (dateError) {
      setError(dateError);
      return;
    }
    const deadlineError = validateVotingDeadline(votingDeadline);
    if (deadlineError) {
      setError(deadlineError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: q,
          start: tripStart,
          end: tripEnd,
          hostName: memberName.trim(),
          votingDeadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "建立房間失敗");

      setRoomCode(data.roomCode);
      setRoomCodeInput(data.roomCode);
      setRoomMeta({
        phase: "voting",
        votingOpen: true,
        votingEndsAt: data.votingEndsAt,
        hostName: data.hostName,
        plantedSeedCode: null,
      });
      await refreshRoomDeck(data.roomCode);
      setIndex(0);
      setLiked([]);
      setPassed([]);
      setStep("swipe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    const code = normalizeRoomCode(roomCodeInput);
    if (code.length !== 6) {
      setError("請輸入 6 碼房間代碼");
      return;
    }
    if (!memberName.trim()) {
      setError("請填寫你的名字");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await loadRoom(code);
      setRoomCode(code);

      if (data.plantedSeedCode) {
        router.push(`/trip/${data.plantedSeedCode}`);
        return;
      }

      if (data.phase === "closed") {
        setStep("summary");
        return;
      }

      await refreshRoomDeck(code);
      setIndex(0);
      setLiked([]);
      setPassed([]);
      setStep("swipe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function startSolo(dest?: string) {
    const q = (dest ?? destinationInput).trim();
    if (!q) return;
    const dateError = validateTripDateRange(tripStart, tripEnd);
    if (dateError) {
      setError(dateError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/discover?destination=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "載入失敗");
      setMeta(data.destination);
      setDeck(data.cards);
      setIndex(0);
      setLiked([]);
      setPassed([]);
      setStep("swipe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function postVote(card: DiscoverCard, direction: "left" | "right") {
    if (!isGroup || !roomCode || !votingOpen) return;
    await fetch(`/api/match/room/${roomCode}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        voterName: memberName.trim(),
        vote: direction === "right" ? "like" : "pass",
      }),
    });
    try {
      await refreshRoomDeck(roomCode);
    } catch (e) {
      const err = e as Error & { votingClosed?: boolean };
      if (err.votingClosed) await goToGroupSummary(roomCode);
    }
  }

  function handleSwipe(direction: "left" | "right") {
    if (!current || exiting || (isGroup && !votingOpen)) return;

    const swiped = current;
    const isLast = index + 1 >= deck.length;

    if (direction === "right") setLiked((prev) => [...prev, swiped]);
    else setPassed((prev) => [...prev, swiped]);

    void postVote(swiped, direction);

    setExiting({ card: swiped, dir: direction });
    if (!isLast) setIndex((i) => i + 1);
    else setIndex(deck.length);

    window.setTimeout(() => {
      setExiting(null);
      if (isLast) {
        if (isGroup && roomCode) {
          void goToGroupSummary(roomCode);
        } else {
          setStep("summary");
        }
      }
    }, 300);
  }

  async function closeVotingEarly() {
    if (!roomCode || !roomMeta) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/match/room/${roomCode}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: memberName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "截止失敗");
      await goToGroupSummary(roomCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "截止失敗");
    } finally {
      setLoading(false);
    }
  }

  async function plantTrip() {
    if (flowMode === "solo") {
      if (liked.length === 0) return;
      const dateError = validateTripDateRange(tripStart, tripEnd);
      if (dateError) {
        setError(dateError);
        return;
      }
    } else {
      if (!roomCode) return;
      if (phase === "planted" && roomMeta?.plantedSeedCode) {
        router.push(`/trip/${roomMeta.plantedSeedCode}`);
        return;
      }
      if (!canPlantGroup) {
        setError("投票截止後才能建立旅程排程");
        return;
      }
    }

    setStep("planting");
    setError(null);
    try {
      if (isGroup && roomCode) {
        const res = await fetch(`/api/match/room/${roomCode}/plant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberName: memberName.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "建立失敗");
        router.push(data.redirectUrl ?? `/trip/${data.seedCode}`);
        return;
      }

      const { startDate, endDate } = tripRangeToIso(tripStart, tripEnd);
      const res = await fetch("/api/discover/plant-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: meta?.label ?? destinationInput,
          memberName: memberName.trim() || undefined,
          startDate,
          endDate,
          liked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      router.push(data.redirectUrl ?? `/trip/${data.seedCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "建立失敗");
      setStep("summary");
    }
  }

  const summaryList = isGroup ? groupLiked : liked;
  const isHost =
    isGroup && roomMeta && memberName.trim() === roomMeta.hostName.trim();

  function copyRoomLink() {
    if (!roomCode) return;
    const url = `${window.location.origin}/discover?mode=join&room=${roomCode}`;
    void navigator.clipboard.writeText(url);
  }

  const modeTabs: { id: FlowMode; label: string; icon: ReactNode }[] = [
    { id: "create", label: "開投票房", icon: <PlusCircle className="h-4 w-4" /> },
    { id: "join", label: "加入投票", icon: <LogIn className="h-4 w-4" /> },
    { id: "solo", label: "單人探索", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-emerald-50 via-white to-amber-50/30">
      <header className="flex items-center justify-between border-b border-emerald-100 bg-white/80 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-emerald-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          PlanT 首頁
        </Link>
        <div className="text-center">
          <p className="text-sm font-bold text-emerald-950">PlanT Match 🌿</p>
          <p className="text-[10px] text-emerald-600">
            {flowMode === "create"
              ? "發起投票"
              : flowMode === "join"
                ? "加入投票"
                : "單人探索"}
          </p>
        </div>
        <div className="w-16" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {step === "landing" && (
          <div className="flex flex-1 flex-col space-y-5">
            <div className="text-center">
              <p className="text-4xl">🌸</p>
              <h1 className="mt-2 text-2xl font-bold text-emerald-950">
                揪團前先投票
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                截止前大家左滑右滑；截止後一起排行程。
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {modeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFlowMode(tab.id);
                    setError(null);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
                    flowMode === tab.id
                      ? "border-emerald-500 bg-emerald-600 text-white shadow"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-800">
                <User className="h-3 w-3" />
                你的名字{flowMode !== "solo" ? "（必填）" : "（選填）"}
              </label>
              <Input
                placeholder={flowMode === "create" ? "發起人暱稱" : "你的暱稱"}
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>

            {flowMode === "join" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-emerald-800">
                  房間代碼（6 碼）
                </label>
                <Input
                  placeholder="ABCDEF"
                  value={roomCodeInput}
                  onChange={(e) =>
                    setRoomCodeInput(normalizeRoomCode(e.target.value))
                  }
                  className="font-mono text-lg uppercase tracking-[0.3em]"
                />
              </div>
            )}

            {flowMode === "create" && (
              <>
                <TripDateFields
                  start={tripStart}
                  end={tripEnd}
                  onStartChange={(v) => {
                    setTripStart(v);
                    if (tripEnd && v > tripEnd) setTripEnd(v);
                  }}
                  onEndChange={setTripEnd}
                  disabled={loading}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-emerald-800">
                    目的地
                  </label>
                  <Input
                    placeholder="台北、東京、福岡…"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-violet-800">
                    <Clock className="h-3 w-3" />
                    投票截止時間
                  </label>
                  <Input
                    type="datetime-local"
                    value={votingDeadline}
                    onChange={(e) => setVotingDeadline(e.target.value)}
                    disabled={loading}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    截止後不能再滑卡，改為團友一起排行程
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {DESTINATIONS.map((d) => (
                    <button
                      key={d.slug}
                      type="button"
                      onClick={() => {
                        setDestinationInput(d.label);
                        void createRoom(d.label);
                      }}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm hover:bg-emerald-50"
                    >
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {flowMode === "solo" && (
              <>
                <TripDateFields
                  start={tripStart}
                  end={tripEnd}
                  onStartChange={(v) => {
                    setTripStart(v);
                    if (tripEnd && v > tripEnd) setTripEnd(v);
                  }}
                  onEndChange={setTripEnd}
                  disabled={loading}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-emerald-800">
                    目的地
                  </label>
                  <Input
                    placeholder="台北、東京、福岡…"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              className="h-12 w-full"
              size="lg"
              disabled={loading}
              onClick={() => {
                if (flowMode === "create") void createRoom();
                else if (flowMode === "join") void joinRoom();
                else void startSolo();
              }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : flowMode === "create" ? (
                <>
                  <PlusCircle className="h-5 w-5" />
                  建立房間並開始投票
                </>
              ) : flowMode === "join" ? (
                <>
                  <LogIn className="h-5 w-5" />
                  加入房間
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  開始滑動探索
                </>
              )}
            </Button>

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {step === "swipe" && (current || exiting) && (
          <div className="flex flex-1 flex-col">
            {isGroup && roomCode && roomMeta && (
              <div className="mb-3 space-y-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
                <p className="text-xs text-violet-800">
                  房間 <span className="font-mono font-bold">{roomCode}</span>
                  {voterCount > 0 && ` · ${voterCount} 人已投票`}
                </p>
                <p className="text-xs font-semibold text-violet-900">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {countdownLabel || formatDeadline(roomMeta.votingEndsAt)}
                </p>
                <button
                  type="button"
                  onClick={copyRoomLink}
                  className="inline-flex items-center gap-1 text-[10px] text-violet-600 hover:underline"
                >
                  <Copy className="h-3 w-3" />
                  複製邀請連結（加入投票）
                </button>
                {isHost && votingOpen && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full border-violet-300 text-xs"
                    disabled={loading}
                    onClick={() => void closeVotingEarly()}
                  >
                    提前截止投票
                  </Button>
                )}
              </div>
            )}

            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-emerald-700">
                <span>
                  {meta?.emoji} {meta?.label}
                </span>
                <span>
                  {index + 1} / {deck.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm flex-1 overflow-hidden">
              {current && deck[index + 1] && (
                <SwipeCard
                  card={deck[index + 1]}
                  style={{
                    transform: "scale(0.95) translateY(8px)",
                    opacity: 0.5,
                    zIndex: 0,
                  }}
                />
              )}
              {current && (
                <SwipeCard key={current.id} card={current} style={{ zIndex: 1 }} />
              )}
              {exiting && (
                <ExitingSwipeCard
                  key={`exit-${exiting.card.id}`}
                  card={exiting.card}
                  dir={exiting.dir}
                />
              )}
            </div>

            <div className="mt-4 flex justify-center gap-8 pb-2">
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full border-rose-200 text-rose-600"
                onClick={() => handleSwipe("left")}
                disabled={!!exiting || (isGroup && !votingOpen)}
                aria-label="跳過"
              >
                <ThumbsDown className="h-7 w-7" />
              </Button>
              <Button
                size="lg"
                className="h-[4.25rem] w-[4.25rem] rounded-full bg-emerald-600 shadow-lg"
                onClick={() => handleSwipe("right")}
                disabled={!!exiting || (isGroup && !votingOpen)}
                aria-label="想去"
              >
                <Heart className="h-8 w-8 fill-current" />
              </Button>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className="flex flex-1 flex-col space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-emerald-950">
                {isGroup ? "投票結果 · 準備排行程" : "你的精選 ✨"}
              </h2>
              {isGroup && roomMeta && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {phase === "voting"
                    ? `投票進行中（${formatDeadline(roomMeta.votingEndsAt)} 截止）· 你已投完`
                    : phase === "planted"
                      ? "旅程已建立"
                      : `投票已截止 · ${voterCount} 人參與`}
                </p>
              )}
              {isGroup && roomCode && (
                <p className="mt-1 font-mono text-xs text-violet-700">
                  房間 {roomCode}
                </p>
              )}
            </div>

            <ul className="max-h-[45dvh] flex-1 space-y-2 overflow-y-auto">
              {summaryList.map((card, i) => (
                <li
                  key={card.id}
                  className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {card.name}
                  </span>
                  {card.groupLabel ? (
                    <span className="shrink-0 text-[10px] font-semibold text-rose-700">
                      {card.groupLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700">
                      🔥{card.popularity}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {isGroup && votingOpen && (
              <>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                  等待投票截止後，即可建立 PlanT 旅程並一起排程
                </p>
                <Button
                  className="h-11 w-full"
                  variant="outline"
                  onClick={() => roomCode && void goToGroupSummary(roomCode)}
                >
                  刷新投票結果
                </Button>
              </>
            )}

            {(!isGroup || !votingOpen) && (
              <div className="flex gap-2">
                {!isGroup && (
                  <Button
                    variant="outline"
                    className="h-11 flex-1"
                    onClick={() => {
                      setStep("swipe");
                      setIndex(0);
                      setLiked([]);
                      setPassed([]);
                    }}
                  >
                    重新滑
                  </Button>
                )}
                <Button
                  className="h-11 flex-1"
                  disabled={
                    flowMode === "solo"
                      ? liked.length === 0
                      : phase !== "planted" && !canPlantGroup
                  }
                  onClick={plantTrip}
                >
                  {phase === "planted"
                    ? "進入 Workspace →"
                    : "建立旅程並排程 →"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "planting" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="font-medium text-emerald-800">正在建立 PlanT 旅程…</p>
          </div>
        )}
      </main>
    </div>
  );
}
