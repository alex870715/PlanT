"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatScheduledAt } from "@/lib/datetime";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  kakaoMapDirectionsUrl,
} from "@/lib/navigation-links";
import { PRESENCE_LABELS } from "@/lib/trip-presence";
import {
  dayLabelForToday,
  getTodayRouteSpots,
  isWithinTripDates,
} from "@/lib/travel-day";
import { seededFetch } from "@/lib/trip-client";
import type { SpotDto, TripDto, TripMemberPresenceDto } from "@/types/trip";

type TravelDayPanelProps = {
  trip: TripDto;
  activeMemberId: string | null;
  onTripUpdate: (trip: TripDto) => void;
};

function presenceBadgeClass(status: TripMemberPresenceDto["status"]): string {
  switch (status) {
    case "arrived":
      return "bg-emerald-100 text-emerald-800";
    case "on_way":
      return "bg-sky-100 text-sky-800";
    case "late":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function TravelDayPanel({
  trip,
  activeMemberId,
  onTripUpdate,
}: TravelDayPanelProps) {
  const [busy, setBusy] = useState(false);
  const [lateMinutes, setLateMinutes] = useState("15");

  const inTrip = isWithinTripDates(trip.startDate, trip.endDate);
  const todaySpots = useMemo(
    () =>
      getTodayRouteSpots(
        trip.spots,
        trip.startDate,
        trip.endDate,
        activeMemberId
      ),
    [trip.spots, trip.startDate, trip.endDate, activeMemberId]
  );

  const presenceByMember = useMemo(
    () => new Map(trip.presences.map((p) => [p.memberId, p])),
    [trip.presences]
  );

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  async function reportStatus(
    status: "on_way" | "arrived" | "late" | "idle",
    spotId?: string
  ) {
    if (!activeMemberId) {
      alert("請先在上方團員區塊按「這是我」綁定身份");
      return;
    }
    setBusy(true);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: activeMemberId,
          status,
          spotId: spotId ?? todaySpots[0]?.id ?? null,
          lateMinutes: status === "late" ? Number(lateMinutes) || 15 : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "更新失敗");
      }
      await refreshTrip();
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  if (!inTrip) {
    return (
      <div className="mb-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-3 text-xs text-violet-800">
        出發日模式會在旅程期間（
        {new Date(trip.startDate).toLocaleDateString("zh-TW")} –{" "}
        {new Date(trip.endDate).toLocaleDateString("zh-TW")}）自動啟用。
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-violet-300/80 bg-gradient-to-br from-violet-50 to-indigo-50/50 p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-violet-950">
          <Navigation className="h-4 w-4" />
          出發日 · {dayLabelForToday(trip.startDate, trip.endDate)}
        </h3>
        {activeMemberId && (
          <span className="text-[11px] text-violet-700">
            你的路線含個人支線
          </span>
        )}
      </div>

      {todaySpots.length === 0 ? (
        <p className="mb-3 text-xs text-violet-800">
          今日尚未排程景點，可到下方時間軸新增。
        </p>
      ) : (
        <ol className="mb-3 space-y-2">
          {todaySpots.map((spot, i) => (
            <TodaySpotRow key={spot.id} spot={spot} index={i + 1} />
          ))}
        </ol>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-xs"
          disabled={busy}
          onClick={() => void reportStatus("on_way")}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          出發中
        </Button>
        <Button
          size="sm"
          className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
          disabled={busy}
          onClick={() => void reportStatus("arrived")}
        >
          到了
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={180}
            value={lateMinutes}
            onChange={(e) => setLateMinutes(e.target.value)}
            className="h-8 w-14 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-amber-300 text-xs text-amber-900"
            disabled={busy}
            onClick={() => void reportStatus("late")}
          >
            晚到
          </Button>
        </div>
      </div>

      {trip.members.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-violet-900">
            <Users className="h-3.5 w-3.5" />
            團員即時狀態
          </p>
          <div className="flex flex-wrap gap-1.5">
            {trip.members.map((m) => {
              const p = presenceByMember.get(m.id);
              const status = p?.status ?? "idle";
              return (
                <span
                  key={m.id}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${presenceBadgeClass(status)}`}
                >
                  {m.name} · {PRESENCE_LABELS[status]}
                  {status === "late" && p?.lateMinutes
                    ? ` ${p.lateMinutes}分`
                    : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TodaySpotRow({ spot, index }: { spot: SpotDto; index: number }) {
  const time = formatScheduledAt(spot.scheduledAt);
  const isSprout = !spot.isTrunk;

  return (
    <li className="rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-violet-950">
            <span
              className={
                isSprout
                  ? "mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-200 text-[10px] font-bold text-lime-900"
                  : "mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white"
              }
            >
              {isSprout ? `S${index}` : index}
            </span>
            {spot.name}
          </p>
          {time && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-violet-700">
              <Clock className="h-3 w-3" />
              {time}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <a
            href={googleMapsDirectionsUrl(
              spot.latitude,
              spot.longitude,
              spot.name
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 rounded border border-violet-200 px-1.5 py-0.5 text-[10px] text-violet-800 hover:bg-violet-50"
          >
            <MapPin className="h-3 w-3" />
            Google
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href={kakaoMapDirectionsUrl(
              spot.latitude,
              spot.longitude,
              spot.name
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 rounded border border-violet-200 px-1.5 py-0.5 text-[10px] text-violet-800 hover:bg-violet-50"
          >
            Kakao
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href={appleMapsDirectionsUrl(spot.latitude, spot.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 rounded border border-violet-200 px-1.5 py-0.5 text-[10px] text-violet-800 hover:bg-violet-50"
          >
            Apple
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </li>
  );
}
